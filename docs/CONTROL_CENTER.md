# Owner Control Center

## How to open it
1. Go to `/admin` on your site (e.g. `http://localhost:3000/admin`) and sign in with an owner/admin account. Signed-in admins also see a green **Control Center** button in the top navigation, and can press **Alt+Shift+A** anywhere.
2. No admin account yet? Either
   - start the server with `OWNER_EMAIL` and `OWNER_PASSWORD` set (10+ chars): `OWNER_EMAIL=you@example.com OWNER_PASSWORD='long-unique-pass' npm start` (creates the account, or promotes an existing one), or
   - run `npm run create-admin -- you@example.com 'long-unique-pass' 'Your Name'`.
3. Once in, use **Owner tools -> Users & admin access** to promote other accounts.

## What's new
- Sticky section bar and a "Needs your attention" panel (assignments, tickets, gig/employer/instructor approvals, scholarships, safety reports, membership requests) plus 7/30-day signups.
- Site announcement banner (dismissible, shown on every page).
- User search and admin/student role management (cannot remove your own access; last admin protected; audit-logged).
- CSV exports: students, payments, enrolments, certificates, audit log (formula-injection safe, logged).
- System health checklist (webhook secret, HTTPS cookies, public URL, AI key, persistent DB).
- Student/enrolment filter box.

All new endpoints are admin-only (`/api/admin/health|users|users/:id/role|export/:kind|announcement`); `GET /api/announcement` is public by design.

## Security hardening (this release)
- Headers on every response: stricter CSP (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri`/`form-action` self), X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS when `COOKIE_SECURE=true`; API responses are `no-store`.
- Static file path check tightened against sibling-directory traversal.
- Per-account lockout: 5 wrong passwords locks that email for 15 minutes (on top of the per-IP limit). Admin sign-ins and failed admin attempts are written to the audit log.
- **Change my password** card in the Control Center; changing it signs out all other devices.
- Expired sessions and stale rate-limit entries are purged automatically.
- Health check warns until the demo `owner@skillora.local` account is replaced.

## Still required before real launch (not done by code alone)
Real payment provider + webhook testing, HTTPS with `COOKIE_SECURE=true`, a persistent `DB_FILE` with tested backups, email verification/password recovery, and a browser/mobile test pass.
