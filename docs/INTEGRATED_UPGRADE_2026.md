# Skillora Academy Integrated Upgrade

This package adds the next integrated academy layer without replacing existing tables or removing existing course, learner, payment, progress, certificate, support, portfolio, retention, referral, or AI-tutor code.

## Implemented in this source package

- Global navigation entries for Careers, Freelance, and Plans.
- Career centre UI: live database-backed opportunity list, application notes, learner application tracker, employer verification request, and instructor application.
- Employer profiles default to `pending`; only manually verified profiles can publish opportunities.
- Freelance marketplace: moderated project listings, KSh budget ranges, deadlines, proposal submissions, proposed budgets/timelines, and a learner's own project/proposal list.
- Membership request flow for all-access monthly, career bundle, and business-team plans. Requests are explicitly not treated as payments or active subscriptions.
- Owner moderation panel for pending freelance listings, employer verification, instructor applications, and membership request status.
- Additive SQLite tables and new API routes; existing learner/payment data is not intentionally deleted or rewritten.
- Automated integration tests for core marketplace, employer verification, applications, instructor intake, membership requests, and admin-only moderation.

## Important production integrations still required

- **Payment and recurring subscriptions:** configure a supported M-Pesa/card provider, webhook verification, refunds, subscription renewals, cancellation, and entitlement enforcement. Membership requests do not charge or activate a plan.
- **Freelance payment protection:** there is no escrow, money holding, payout system, or dispute adjudication in this package. Do not advertise escrow until a regulated provider and legal/operational process are integrated.
- **Live job feeds:** current jobs are records published by an admin or verified employer; no external job API, automatic source verification, or expiry crawler is configured. Admins must verify authenticity and keep listings current.
- **Instructor workflow:** applications can be reviewed, but instructor account permissions, revenue sharing, course co-authoring and payout processing still need implementation.
- **Practice labs:** lessons, quizzes, assignments and AI tutor exist; isolated executable coding sandboxes, spreadsheet runtimes and design tools are not bundled here.
- **AI tutor:** needs a valid server-side provider API key and usage/billing limits. No key is bundled.
- **Notifications:** preferences and queue storage exist, but email/SMS/push delivery requires a configured provider and scheduled worker.
- **Quality gates:** automated API tests and syntax checks pass; complete browser/device, accessibility, penetration, load and live-provider tests remain necessary before public launch.

## Deploy safely

1. Back up the live database and verify that the backup can be restored.
2. Deploy the source with the same persistent database volume and environment variables.
3. Confirm the server has permission to create additive tables.
4. Test registration, login, course progress, payments/webhooks, certificates, support, career applications, marketplace moderation and owner access in staging.
5. Do not seed production with fake job listings, employer profiles, learner outcomes, reviews or revenue.

The package is source code only; it does not deploy itself to the live website.

## Frontend interaction and search pass (2026-10-25)

- Course catalogue search now tokenizes multi-word queries and searches title, summary, slug, level, tags, and inferred topic family.
- Added topic filters, sorting by name/price/lesson count, clear/reset controls, result counts, and locally saved courses (stored only in the current browser/device).
- Added live text search and visible-result counts to opportunities and freelance listings.
- Added Ctrl/Cmd+K focus shortcut for course search and Escape to clear the course query.
- Internal section links now return to the home page when their target is not present in a dynamically rendered app view.
- API requests now have a 20-second timeout and clearer network/timeout messages.
- Added automated source-level UI/search regression checks. These complement, but do not replace, full browser-based cross-device and keyboard testing.

### Remaining release checks

- Run browser-based end-to-end tests for every role (guest, learner, admin) on desktop and mobile widths.
- Confirm payment provider credentials, callback/webhook delivery, renewal/refund rules, and persistent production database configuration before accepting live payments.
- Verify real opportunity sources and keep listings moderated and current.
