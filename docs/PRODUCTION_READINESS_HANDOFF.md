# Skillora Academy — Production Readiness Handoff

## Changes in this update
- Public navigation now labels the account actions explicitly as **Log in** and **Sign up**.
- The **Sign up** navigation action and hero action open the registration form directly, rather than opening login mode first.
- The footer has separate Log in and Sign up actions.
- Canonical, Open Graph and structured-data URLs in the homepage use `https://skilloraacademy.space/`.
- The automated payment test selects a paid course from the catalogue and uses a separate learner for the failed-payment case, avoiding assumptions about a particular course's price.
- The production launch checklist now documents the required release gates and production environment setup.

## What this package does not prove
A source ZIP cannot itself deploy to Render or inspect private production environment variables. No claim is made that live registration, the live database, live M-Pesa/card payments, email delivery, backups/restores, mobile browsers, or owner controls have all passed production verification. Those require tests against the deployed service and real configured providers.

## Safe release sequence
1. Back up the current production database and confirm the persistent disk path.
2. Deploy this source to staging, not directly over production.
3. Set secrets in the hosting dashboard, not in source files.
4. Run `npm test` and inspect every failure. A failure is a release blocker until resolved or documented with evidence.
5. Test sign-up, login, password recovery, course loading, lesson progress, payment sandbox success/failure/duplicate callbacks, certificates, owner access, and mobile layouts.
6. Confirm the database survives a restart and a redeploy, and test restoring a backup.
7. Deploy to production, run the same smoke tests, monitor logs, and retain a rollback release.

## Payment safety
The application is designed not to grant paid access merely because a checkout was started. Keep live payment collection disabled until provider credentials, server-side verification, webhook security and reconciliation are validated with the provider's official test environment.
