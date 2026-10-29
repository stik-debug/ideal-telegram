# Skillora Academy on Render — persistent accounts and safe deployments

## Critical: the database must live on persistent storage

Skillora currently uses SQLite (`DB_FILE`). The default relative path (`./data/skillforge.db`) is on the Render service's temporary filesystem. If the service is redeployed or rebuilt, that database may be removed. That is why accounts, enrolments and progress can appear to reset.

The app now refuses to start on Render unless `DB_FILE` points to an absolute path under `/var/data/`. This is intentional protection: a clear deployment error is safer than silently launching an empty academy.

## Do not change the database path before backing up existing records

If the current live service still contains student accounts or payments, **do not redeploy or change `DB_FILE` yet**. First make a recoverable copy of the current database using the currently deployed service's Render Shell/backup procedure. Confirm the backup file exists and is non-empty, and retain a copy outside the service. If your current deployment has already reset and no backup exists, those deleted records cannot be reconstructed from this source ZIP.

## Recommended Render setup

1. Open the existing Skillora Web Service in the Render dashboard.
2. Before changing environment variables or attaching storage, back up the database currently used by the live service.
3. Attach a persistent Render Disk to the existing service with mount path `/var/data` (disk availability and pricing depend on your Render plan).
4. Restore/copy the verified existing database onto that disk as `/var/data/skillora.db`. Do not create an empty replacement if you need to preserve existing users.
5. Set `DB_FILE=/var/data/skillora.db` in the existing service's environment variables.
6. Keep the existing service, domain, secret values, payment-provider credentials and other environment settings. Do not create a new service unless there is a separate reason.
7. Deploy and inspect logs. Confirm the startup log shows `DB_FILE= /var/data/skillora.db` and there is no unsafe/ephemeral database error.
8. Test login with an existing account, check a known enrolment and progress record, then create a test account.
9. Trigger a second deployment and confirm both accounts, enrolments, payments and progress still exist.
10. Keep scheduled off-site backups and test restoration regularly.

## Environment variables

Set the database path on the existing service:

```text
DB_FILE=/var/data/skillora.db
COOKIE_SECURE=true
PUBLIC_URL=https://skilloraacademy.space
```

Keep your actual existing `OWNER_EMAIL`, `OWNER_PASSWORD`, payment-provider keys, mail settings and other secrets configured in Render. Never put production secrets into this ZIP or commit them to GitHub.

## Important notes

- Adding a Render PostgreSQL instance does not migrate this application to PostgreSQL. The current code uses SQLite; a PostgreSQL migration requires a separate code and data migration.
- A persistent disk protects the database file from ordinary redeploys, but it is not a backup. Keep separate backups.
- Do not use `:memory:` or a relative path for production.
- The application no longer automatically renames a failed production database and boots a fresh one. A database error should stop startup and trigger recovery, not erase the evidence.
- Use a staging deployment to test code changes before production.
