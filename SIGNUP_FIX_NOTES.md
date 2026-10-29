# Sign-up visibility fix (2026-10-29)

- The public navigation now clearly shows **Log in** and **Sign up** rather than hiding registration behind a generic “Get started” label.
- Clicking **Sign up** opens the auth form directly in registration mode, including the name field and account-creation submit button.
- Clicking **Log in** opens the same form in login mode. The user can still switch modes from inside the form.
- Added a focused UI regression test for the explicit sign-up entry point.

Validation: `node --check public/app.js` passed; `node --test tests/ui-search.test.js` passed (5/5).

Deployment note: these source changes are not live until this ZIP is deployed to the existing Render service/repository. Keep the existing production database, persistent disk, and environment variables unchanged. Do not create a new service or replace the database as part of this UI fix.
