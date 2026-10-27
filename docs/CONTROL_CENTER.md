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
