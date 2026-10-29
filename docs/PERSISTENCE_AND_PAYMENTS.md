# Persistence and payment safety

## Student accounts disappearing after deployment

The app uses SQLite controlled by `DB_FILE`. A relative path such as `./data/skillforge.db` is not persistent on Render and can be wiped by a redeploy. In the existing Render service, attach a persistent disk mounted at `/var/data` and set `DB_FILE=/var/data/skillora.db`.

**Before changing the path:** back up the database used by the current live service and restore that exact database file to the persistent disk. Merely changing `DB_FILE` creates/opens a different database; it does not copy existing users or records. Test the restored database before deployment. Do not overwrite a non-empty production database with an empty one.

The application now blocks unsafe relative database paths on Render and does not automatically reset a production database when opening/validation fails. This avoids silently making all users start over. If records were already erased from temporary storage and no backup exists, source-code changes cannot recover them.

## Payment safety

Only grant paid-course access after the server verifies a provider's successful payment callback. Keep payment secrets in the hosting environment, protect against duplicate webhook events, reconcile payments and enrolments, and test failed/pending/retried payments in the provider's sandbox before production.

## Backup policy

Keep encrypted backups outside the web service, restrict access, record backup timestamps, and periodically test restoration into a separate staging database. A persistent disk is not a backup.
