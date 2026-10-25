#!/usr/bin/env python3
"""Root-owned deployment controller; never execute repository code as root here.

Install a reviewed copy at /usr/local/lib/rahnamo/deploy.py. GitHub's restricted
SSH key may request only the latest main SHA. Builds receive public settings only.
"""

import fcntl
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone

REPO = 'https://github.com/diyorislomov/rahnamo.git'
LIVE = Path('/var/www/rahnamo')
BACKUPS = Path('/var/www/rahnamo-backups')
STATE = Path('/var/lib/rahnamo-deploy')
BUILD_USER = 'rahnamo-build'
PUBLIC_KEYS = frozenset({
    'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_PAYMENT_CARD_NUMBER',
    'NEXT_PUBLIC_PAYMENT_CARD_OWNER',
})
PAGES = ('/', '/match', '/forum', '/become-counselor', '/login')


def validate_sha(value):
    if not re.fullmatch(r'[0-9a-f]{40}', value):
        raise ValueError('Expected a full, lowercase Git commit SHA')
    return value


def ssh_sha(command):
    match = re.fullmatch(r'deploy ([0-9a-f]{40})', command)
    if not match:
        raise ValueError('This key accepts only: deploy <40-character SHA>')
    return match.group(1)


def public_settings(text):
    # Copy complete single-line dotenv assignments, preserving their quoting.
    # Multiline public settings are unsupported: reject rather than copy secrets.
    result = []
    for line in text.splitlines():
        match = re.match(r'^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)$', line)
        if match and match[1] in PUBLIC_KEYS:
            value = match[2].strip()
            if value.startswith(('"', "'")) and not value.endswith(value[0]):
                raise ValueError('Multiline public environment values are unsupported')
            result.append(line)
    return '\n'.join(result) + '\n'


def run(args, cwd=None, capture=False, timeout=90):
    return subprocess.run(args, cwd=cwd, check=True, text=True, timeout=timeout,
                          stdout=subprocess.PIPE if capture else None).stdout


def git(directory, *args):
    return run(['git', '-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false',
                '-C', str(directory), *args], capture=True).strip()


def latest_main():
    # Use a fixed remote URL, not a URL supplied by a workflow or checkout config.
    run(['git', '-C', str(LIVE), 'fetch', '--no-tags', REPO,
         '+refs/heads/main:refs/remotes/origin/main'])
    return git(LIVE, 'rev-parse', 'origin/main')


def set_owner(directory, uid, gid, include_git=True):
    for root, dirs, files in os.walk(directory, followlinks=False):
        if not include_git and Path(root) == directory:
            dirs[:] = [name for name in dirs if name != '.git']
        os.chown(root, uid, gid, follow_symlinks=False)
        for name in dirs + files:
            if not include_git and Path(root) == directory and name == '.git':
                continue
            os.chown(Path(root) / name, uid, gid, follow_symlinks=False)


def readable_git_metadata(directory):
    # The controller uses umask 077, but next.config.ts must read HEAD as the
    # build user. Metadata stays root-owned and read-only in the build mount.
    for root, dirs, files in os.walk(directory, followlinks=False):
        Path(root).chmod(0o755)
        for name in files:
            path = Path(root) / name
            if not path.is_symlink():
                path.chmod(0o644)


def sandbox_command(stage, unit, command):
    # Hide all other /var contents (including production env, DB and backups).
    # Bind back only this release. Protect Git metadata from build-time changes.
    return [
        'systemd-run', '--quiet', '--collect', '--wait', '--pipe', '--unit=' + unit,
        '-p', 'User=' + BUILD_USER, '-p', 'Group=' + BUILD_USER,
        '-p', 'WorkingDirectory=' + str(stage), '-p', 'ProtectSystem=strict',
        '-p', 'ProtectHome=yes', '-p', 'PrivateTmp=yes', '-p', 'PrivateDevices=yes',
        '-p', 'NoNewPrivileges=yes', '-p', 'ProtectProc=invisible',
        '-p', 'TemporaryFileSystem=/var:ro', '-p', 'BindPaths=' + str(stage),
        '-p', 'BindReadOnlyPaths=' + str(stage / '.git'),
        '-p', 'RuntimeMaxSec=900', '-p', 'MemoryMax=3G', '-p', 'TasksMax=256',
        '/usr/bin/env', '-i', 'PATH=/usr/local/bin:/usr/bin:/bin', 'HOME=/tmp',
        'NEXT_TELEMETRY_DISABLED=1', 'NODE_OPTIONS=--max-old-space-size=2048',
        'GIT_CONFIG_COUNT=1', 'GIT_CONFIG_KEY_0=safe.directory',
        'GIT_CONFIG_VALUE_0=' + str(stage), *command,
    ]


def response(port, path):
    req = urllib.request.Request(f'http://127.0.0.1:{port}{path}',
                                 headers={'Host': 'myrahnamo.com', 'X-Forwarded-Proto': 'https'})
    with urllib.request.urlopen(req, timeout=10) as result:
        return result.read().decode(errors='replace')


def health(port, sha):
    for attempt in range(30):
        try:
            if json.loads(response(port, '/api/build-version')).get('version') == sha:
                break
        except (OSError, ValueError):
            pass
        time.sleep(1)
    else:
        raise RuntimeError('Version health check failed')
    for path in PAGES:
        if '<html' not in response(port, path):
            raise RuntimeError('Page health check failed: ' + path)


def preview(stage, sha, stamp):
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    unit = 'rahnamo-preview-' + stamp
    command = sandbox_command(stage, unit, [
        '/usr/bin/node', 'node_modules/next/dist/bin/next', 'start',
        '-H', '127.0.0.1', '-p', str(port),
    ])
    with (STATE / (stamp + '-preview.log')).open('w') as log:
        proc = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT)
        try:
            health(port, sha)
        finally:
            subprocess.run(['systemctl', 'stop', unit], check=False, timeout=30,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            proc.wait(timeout=30)


def activate(live, stage, backup, stop, start, verify):
    """Restore the complete previous release if restart or health checks fail."""
    if backup.exists():
        raise FileExistsError(backup)
    stopped = False
    try:
        # A failing stop command may already have stopped the process.
        stopped = True
        stop()
        live.rename(backup)
        stage.rename(live)
        start()
        verify()
    except BaseException:
        if stopped:
            try:
                stop()
            except Exception as error:
                print('Rollback stop warning: ' + str(error), file=sys.stderr)
            if backup.exists():
                if live.exists():
                    live.rename(stage.with_name(stage.name + '-failed'))
                backup.rename(live)
            start()
        raise


def install_runtime_env(stage):
    target = stage / '.env.production.local'
    # A build must not be able to redirect the root-owned secret copy via symlink.
    if target.is_symlink() or (target.exists() and not target.is_file()):
        raise RuntimeError('Unexpected runtime environment file type')
    target.unlink(missing_ok=True)
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as output:
        output.write((LIVE / '.env.production.local').read_bytes())


def write_state(stamp, data):
    target = STATE / (stamp + '.json')
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, indent=2) + '\n')
    temporary.replace(target)


def require_schema_approval(previous, sha):
    # Only an operator can write STATE. The CI SSH command cannot approve DDL.
    receipt = STATE / 'schema-approvals' / (sha + '.json')
    try:
        approval = json.loads(receipt.read_text())
    except (OSError, ValueError):
        approval = {}
    if not isinstance(approval, dict) or approval.get('previous') != previous or approval.get('target') != sha or approval.get('status') != 'applied':
        raise RuntimeError('Database migration changes require a reviewed, applied migration receipt for this exact release')


def deploy(sha):
    validate_sha(sha)
    if latest_main() != sha:
        raise RuntimeError('Requested commit is no longer the latest main; run the latest workflow')
    if git(LIVE, 'status', '--porcelain'):
        raise RuntimeError('Production checkout has local changes; refusing to overwrite them')
    previous = git(LIVE, 'rev-parse', 'HEAD')
    if previous == sha:
        health(3002, sha)
        print('Already deployed and healthy: ' + sha, flush=True)
        return
    # Schema changes need an explicit database migration plan, not a blind deploy.
    if git(LIVE, 'diff', '--name-only', previous, sha, '--', 'database'):
        require_schema_approval(previous, sha)
    if shutil.disk_usage(LIVE).free < 3 * 1024**3:
        raise RuntimeError('At least 3 GiB of free disk is required')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    stage = LIVE.parent / ('.rahnamo-release-' + stamp + '-' + sha[:8])
    backup = BACKUPS / (stamp + '-' + previous[:8])
    data = {'previous': previous, 'target': sha, 'stage': str(stage), 'backup': str(backup), 'status': 'building'}
    write_state(stamp, data)
    try:
        run(['git', 'clone', '--no-hardlinks', '--no-checkout', str(LIVE), str(stage)])
        git(stage, 'remote', 'set-url', 'origin', REPO)
        git(stage, 'checkout', '-B', 'main', sha)
        git(stage, 'update-ref', 'refs/remotes/origin/main', sha)
        git(stage, 'branch', '--set-upstream-to=origin/main', 'main')
        readable_git_metadata(stage / '.git')
        build_user = pwd.getpwnam(BUILD_USER)
        (stage / '.env.production.local').write_text(public_settings((LIVE / '.env.production.local').read_text()))
        set_owner(stage, build_user.pw_uid, build_user.pw_gid, include_git=False)
        # The command string is fixed operator code, never interpolated repo input.
        build = 'npm ci --ignore-scripts --no-audit --no-fund && npm test && npm run build'
        run(sandbox_command(stage, 'rahnamo-build-' + stamp, ['/bin/sh', '-eu', '-c', build]), timeout=960)
        preview(stage, sha, stamp)
        set_owner(stage, 0, 0)
        if git(stage, 'status', '--porcelain'):
            raise RuntimeError('Build modified tracked or unignored source files')
        if latest_main() != sha:
            raise RuntimeError('Main changed during build; the latest workflow will deploy it')
        if git(LIVE, 'rev-parse', 'HEAD') != previous or git(LIVE, 'status', '--porcelain'):
            raise RuntimeError('Production changed during build; aborting')
        install_runtime_env(stage)
        data['status'] = 'activating'
        write_state(stamp, data)
        activate(LIVE, stage, backup,
                 lambda: run(['pm2', 'stop', 'rahnamo']),
                 lambda: run(['pm2', 'restart', 'rahnamo']),
                 lambda: health(3002, sha))
        run(['pm2', 'save'])
        data['status'] = 'deployed'
        write_state(stamp, data)
        print('DEPLOYED ' + sha + '\nBACKUP ' + str(backup), flush=True)
    except BaseException:
        data['status'] = 'failed'
        write_state(stamp, data)
        raise


def main():
    if len(sys.argv) == 2 and sys.argv[1] == '--ssh':
        sha = ssh_sha(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    elif len(sys.argv) == 2:
        sha = validate_sha(sys.argv[1])
    else:
        raise ValueError('Usage: deploy.py <commit SHA> or --ssh')
    if os.geteuid() != 0:
        raise PermissionError('The installed controller must run as root')
    os.umask(0o077)
    STATE.mkdir(mode=0o700, exist_ok=True)
    BACKUPS.mkdir(mode=0o700, exist_ok=True)
    def interrupted(signum, frame):
        raise RuntimeError('Deployment interrupted by signal ' + str(signum))
    for signum in (signal.SIGTERM, signal.SIGHUP, signal.SIGINT):
        signal.signal(signum, interrupted)
    with (STATE / 'deploy.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        deploy(sha)


if __name__ == '__main__':
    main()
