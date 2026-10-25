# Rahnamo CI/CD

`.github/workflows/ci-cd.yml` validates pull requests and pushes to `main` with
deployment-controller tests, `npm ci --ignore-scripts`, application tests and a
production build. A successful `main` run deploys that exact commit to
`https://myrahnamo.com`. **Run workflow** can retry the current `main` release.

The CI build uses placeholders and is never shipped to production. The server
build uses the existing public browser settings; private runtime settings stay
on the server and are installed only after build and preview checks pass.

## Installed server components

- Live checkout: `/var/www/rahnamo`; PM2 process: `rahnamo`; local port: `3002`.
- Reviewed controller: `/usr/local/lib/rahnamo/deploy.py`, owned by root.
- Build account: `rahnamo-build`, without a login shell.
- Deployment records and preview logs: `/var/lib/rahnamo-deploy/`.
- Previous complete releases: `/var/www/rahnamo-backups/`.

The GitHub key is a separate Ed25519 key with this forced SSH command:

```text
restrict,command="/usr/bin/python3 /usr/local/lib/rahnamo/deploy.py --ssh" ssh-ed25519 <public key> rahnamo-github-actions
```

It accepts only `deploy <full lowercase SHA>`. Shell commands, forwarding and
PTYs are disabled. The controller verifies that the SHA is the latest upstream
`main`, serializes deployments, rejects local production edits and stages the
release before stopping PM2. Builds run as an unprivileged user in a systemd
filesystem sandbox with no production directories or private environment.

After a successful build and preview, the complete previous directory is moved
to a timestamped backup. Startup or health-check failures restore that directory
and restart it. `/api/build-version` and five public pages are checked. GitHub
also verifies the version through the public HTTPS domain.

Schema changes under `database/` stop automatic deployment until an operator has
backed up PostgreSQL, tested and applied the exact migration, then saved a
root-owned receipt at `/var/lib/rahnamo-deploy/schema-approvals/<target-SHA>.json`:

```json
{"previous":"<live full SHA>","target":"<target full SHA>","status":"applied"}
```

The receipt authorizes only that exact transition. CI cannot create receipts or
run database migrations. Rerun the failed deploy job after saving the receipt.
Keep migrations additive so restoring an older application remains possible.
New installations use `node --env-file=.env.production.local scripts/migrate.mjs`;
the runner records and verifies migration checksums in `schema_migrations`.

Uploads are stored outside releases in `/var/lib/rahnamo/uploads` (`UPLOAD_DIR`).
Back up this directory and PostgreSQL together. PostgreSQL runs in the
`rahnamo-postgres` container; use its `pg_dump -Fc`/`pg_restore` tools for backups.
For an application rollback, keep `UPLOAD_DIR` configured to the same directory.
Backups are retained for operator review; remove obsolete backups when disk
space is low. The controller refuses a build with less than 3 GiB free.

## GitHub configuration

Repository variable:

- `RAHNAMO_DEPLOY_HOST`: production server address.

Repository secrets:

- `RAHNAMO_DEPLOY_KEY`: private half of the restricted CI key, never a personal
  SSH key. Rotate it by installing a replacement restricted public key, updating
  the GitHub secret, verifying a deployment, then removing the old public key.
- `RAHNAMO_KNOWN_HOSTS`: pinned production SSH host key obtained through an
  already trusted server connection. Do not use unverified `ssh-keyscan` output.

The production job runs only in `diyorislomov/rahnamo` on `main`; PR and fork
jobs cannot access deployment secrets. External actions are pinned to verified
commit SHAs, following [GitHub's secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).

## Controller maintenance

Controller changes in the repository do **not** automatically replace the
root-owned installed controller. Test and review them, then explicitly install
the reviewed file with root ownership and mode `0755`. This prevents repository
build scripts from replacing the privileged deployment entrypoint.

Run its tests with:

```bash
python3 -m unittest discover -s ops/tests -v
```

Use the authenticated operator SSH connection for emergency rollback. Stop
`rahnamo`, move the failed live directory aside, restore the chosen complete
backup to `/var/www/rahnamo`, restart `rahnamo`, check `/api/build-version` and
public pages, then run `pm2 save`. The CI key intentionally has no arbitrary
rollback or shell capability. Revert the bad change in GitHub before retrying
the automatic pipeline.
