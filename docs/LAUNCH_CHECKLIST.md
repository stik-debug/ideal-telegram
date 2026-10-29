# Skillora Academy launch checklist

Use this checklist on the deployed staging site before accepting public payments. Automated tests are useful but do not replace provider sandbox tests and manual device checks.

## Admin and content
- [ ] Create the first admin using the deployment's secure one-time procedure; do not publish credentials.
- [ ] Confirm a student cannot access `/api/admin/*` routes or another learner's assignments, tickets, or certificate PDFs.
- [ ] Test editing course title, summary, slug, price and publication status.
- [ ] Test creating courses and adding/editing lessons; verify the public catalogue reflects changes.
- [ ] Review course content, project instructions, file sizes and any external links.
- [ ] Check enrolment and payment records against provider records before resolving discrepancies.

## Student support and assignments
- [ ] Submit an allowed assignment file and reject unsupported file types and files above 500 KB.
- [ ] Confirm only the submitter and admins can download the assignment.
- [ ] Submit instructor feedback and confirm it is visible to the learner.
- [ ] Open a support ticket, reply from both roles, and confirm ticket status updates.
- [ ] Test empty, long, malformed and unauthorized requests.

## Certificates
- [ ] Complete every course lesson as a learner and issue the PDF certificate.
- [ ] Verify its unique code on `/api/verify/:code`; confirm invalid codes return not found.
- [ ] Confirm another learner cannot download the certificate PDF.
- [ ] Confirm the certificate says Certificate of Completion and does not imply accreditation, licensing, a degree or external endorsement.

## Responsive and accessibility checks
- [ ] Manually test at 320 px, 375 px, 768 px, 1024 px and 1440 px viewport widths.
- [ ] Check navigation, forms, course cards, dashboards, long lesson content and admin tables on mobile and desktop.
- [ ] Complete sign-in, lessons, checkout flow, assignment submission and ticket replies using keyboard only.
- [ ] Check visible focus, heading order, form labels, meaningful button names, error announcements and color contrast.
- [ ] Test reduced-motion preference and browser zoom at 200%.
- [ ] Run an accessibility scanner (for example axe or Lighthouse) on the deployed pages and manually review every reported issue.
- [ ] Test current Chrome, Firefox and Safari/WebKit where available.

## Production and payments
- [ ] Set strong production secrets and HTTPS; set `COOKIE_SECURE=true`.
- [ ] Configure a real payment provider and implement its official server-side checkout and webhook signature verification before taking live payments.
- [ ] Test successful, failed, cancelled, duplicate, mismatched-amount and refunded payment events in provider sandbox.
- [ ] Confirm course access is granted only after trusted successful payment confirmation.
- [ ] Configure database persistence and backups; test a restore.
- [ ] Publish contact details, privacy notice, terms, refund policy and support response expectations.
- [ ] Verify email delivery if email notifications are enabled.
- [ ] Confirm monitoring, error logging, dependency updates and incident contact.
- [ ] Perform a final smoke test after deployment and keep a rollback copy of the previous release.

## Release gate
Do not launch live payments until the payment provider integration, production secrets, backup/restore and device/accessibility checks above have been completed. The automated test suite does not prove live payment readiness or full accessibility conformance.

## Release status for this source update (2026-10-29)

This checklist is intentionally not marked complete. The source can be prepared and automated checks can run locally, but a production-ready claim requires access to the deployed Render service, its logs, persistent disk, real payment-provider sandbox/configuration, and owner-controlled production account. Do not accept live payments until every applicable item above has been tested on staging and the production smoke test passes.

## Required deployment configuration

- Set `PUBLIC_URL=https://skilloraacademy.space` (the live domain, not the example domain).
- Set `DB_FILE=/var/data/skillora.db` only after confirming a persistent Render disk is mounted at `/var/data`; otherwise use the actual configured persistent mount path. Back up the existing database before changing this value and migrate/copy existing records safely.
- Set a unique, long `OWNER_PASSWORD` and the actual `OWNER_EMAIL` in the hosting dashboard; never commit these secrets into the ZIP or Git repository.
- Configure `COOKIE_SECURE=true` on HTTPS.
- Configure provider credentials and callback/webhook secrets in the hosting dashboard only. Test with provider sandbox credentials first.
- Configure real email delivery if email confirmation, password reset or transactional emails are expected to work. Development logs are not email delivery.
- Deploy to staging first, run `npm test`, then manually run the release checklist on the deployed staging site. Deploy to production only after a successful backup and rollback plan.
