import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('deploy', Path(__file__).parents[1] / 'deploy.py')
deploy = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(deploy)


class RequestTests(unittest.TestCase):
    def test_only_exact_sha_command_is_accepted(self):
        sha = 'a' * 40
        self.assertEqual(deploy.ssh_sha('deploy ' + sha), sha)
        for command in ['id', 'deploy main', 'deploy ' + sha + ';id',
                        'deploy ' + sha + '\n', 'deploy ' + sha + ' extra',
                        'deploy ' + 'A' * 40, 'env FOO=bar deploy ' + sha]:
            with self.subTest(command=command), self.assertRaises(ValueError):
                deploy.ssh_sha(command)

    def test_private_env_values_are_excluded(self):
        source = ('DATABASE_URL=private\nAUTH_SECRET=secret\n'
                  'NEXT_PUBLIC_SITE_URL=https://myrahnamo.com\n'
                  'NEXT_PUBLIC_UNREVIEWED_SECRET=not-allowed\n'
                  'export NEXT_PUBLIC_PAYMENT_CARD_OWNER="Public Name"\n')
        result = deploy.public_settings(source)
        self.assertNotIn('secret', result)
        self.assertNotIn('private', result)
        self.assertNotIn('UNREVIEWED', result)
        self.assertIn('https://myrahnamo.com', result)
        self.assertIn('"Public Name"', result)

    def test_multiline_public_env_is_rejected(self):
        with self.assertRaises(ValueError):
            deploy.public_settings('NEXT_PUBLIC_SITE_URL="first\nAUTH_SECRET=hidden\n"')

    def test_build_sandbox_hides_production_and_protects_git(self):
        stage = Path('/var/www/.rahnamo-release-test')
        command = deploy.sandbox_command(stage, 'test-unit', ['npm', 'test'])
        self.assertIn('TemporaryFileSystem=/var:ro', command)
        self.assertIn('BindReadOnlyPaths=' + str(stage / '.git'), command)
        self.assertIn('User=rahnamo-build', command)
        self.assertIn('NoNewPrivileges=yes', command)
        self.assertIn('-i', command)


class SchemaApprovalTests(unittest.TestCase):
    def test_receipt_is_bound_to_both_releases(self):
        import json
        with tempfile.TemporaryDirectory() as directory, patch.object(deploy, 'STATE', Path(directory)):
            previous, target = 'a' * 40, 'b' * 40
            with self.assertRaises(RuntimeError): deploy.require_schema_approval(previous, target)
            receipts = Path(directory) / 'schema-approvals'
            receipts.mkdir()
            (receipts / (target + '.json')).write_text(json.dumps({'previous': previous, 'target': target, 'status': 'applied'}))
            deploy.require_schema_approval(previous, target)
            with self.assertRaises(RuntimeError): deploy.require_schema_approval('c' * 40, target)
            with self.assertRaises(RuntimeError): deploy.require_schema_approval(previous, 'c' * 40)
            (receipts / (target + '.json')).write_text('{invalid')
            with self.assertRaises(RuntimeError): deploy.require_schema_approval(previous, target)


class ActivationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.live, self.stage, self.backup = [root / name for name in ('live', 'stage', 'backup')]
        self.live.mkdir(); self.stage.mkdir()
        (self.live / 'version').write_text('old')
        (self.live / '.env.production.local').write_text('original-private-config')
        (self.stage / 'version').write_text('new')
        self.events = []

    def activate(self, verify=lambda: None, start=None):
        deploy.activate(self.live, self.stage, self.backup,
                        lambda: self.events.append('stop'),
                        start or (lambda: self.events.append('start')), verify)

    def test_success_keeps_complete_backup(self):
        self.activate()
        self.assertEqual((self.live / 'version').read_text(), 'new')
        self.assertEqual((self.backup / 'version').read_text(), 'old')
        self.assertEqual((self.backup / '.env.production.local').read_text(), 'original-private-config')
        self.assertEqual(self.events, ['stop', 'start'])

    def test_failed_health_restores_previous_release_and_preserves_failed_build(self):
        def unhealthy(): raise RuntimeError('unhealthy')
        with self.assertRaisesRegex(RuntimeError, 'unhealthy'):
            self.activate(verify=unhealthy)
        self.assertEqual((self.live / 'version').read_text(), 'old')
        self.assertEqual((self.stage.with_name('stage-failed') / 'version').read_text(), 'new')
        self.assertEqual(self.events, ['stop', 'start', 'stop', 'start'])

    def test_restart_failure_restores_old_release(self):
        count = 0
        def start():
            nonlocal count
            count += 1
            if count == 1: raise RuntimeError('start failed')
        with self.assertRaisesRegex(RuntimeError, 'start failed'):
            self.activate(start=start)
        self.assertEqual(count, 2)
        self.assertEqual((self.live / 'version').read_text(), 'old')

    def test_rollback_restores_files_even_if_stop_reports_an_error(self):
        calls = 0
        def stop():
            nonlocal calls
            calls += 1
            if calls == 2: raise RuntimeError('already stopped')
        def unhealthy(): raise RuntimeError('unhealthy')
        with self.assertRaisesRegex(RuntimeError, 'unhealthy'):
            deploy.activate(self.live, self.stage, self.backup, stop,
                            lambda: self.events.append('start'), unhealthy)
        self.assertEqual((self.live / 'version').read_text(), 'old')
        self.assertEqual(self.events, ['start', 'start'])

    def test_partially_failed_initial_stop_restarts_unchanged_live_release(self):
        def stop(): raise RuntimeError('stop command failed')
        with self.assertRaisesRegex(RuntimeError, 'stop command failed'):
            deploy.activate(self.live, self.stage, self.backup, stop,
                            lambda: self.events.append('start'), lambda: None)
        self.assertEqual((self.live / 'version').read_text(), 'old')
        self.assertEqual(self.events, ['start'])

    def test_missing_stage_restores_live_directory(self):
        (self.stage / 'version').unlink(); self.stage.rmdir()
        with self.assertRaises(FileNotFoundError): self.activate()
        self.assertEqual((self.live / 'version').read_text(), 'old')

    def test_backup_collision_does_not_stop_service(self):
        self.backup.mkdir()
        with self.assertRaises(FileExistsError): self.activate()
        self.assertEqual(self.events, [])
        self.assertEqual((self.live / 'version').read_text(), 'old')

    def test_interruption_rolls_back(self):
        def interrupt(): raise KeyboardInterrupt()
        with self.assertRaises(KeyboardInterrupt): self.activate(verify=interrupt)
        self.assertEqual((self.live / 'version').read_text(), 'old')

    def test_runtime_secret_symlink_is_rejected(self):
        target = self.stage / '.env.production.local'
        outside = Path(self.temp.name) / 'outside'
        outside.write_text('do-not-overwrite')
        target.symlink_to(outside)
        with patch.object(deploy, 'LIVE', self.live), self.assertRaises(RuntimeError):
            deploy.install_runtime_env(self.stage)
        self.assertEqual(outside.read_text(), 'do-not-overwrite')


if __name__ == '__main__':
    unittest.main()
