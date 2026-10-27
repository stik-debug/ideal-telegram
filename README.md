# Skillora Academy

A Kenya-focused, affordable digital-skills learning platform built with Node.js and SQLite. The project includes a responsive course catalogue, student accounts, lessons, quizzes, progress tracking, a student dashboard, certificate issuance and downloadable PDF certificates.

## Included curriculum

Six original learning paths, with eight lessons and a knowledge-check quiz in every lesson (48 lessons total):

- **Python Programming: Zero to Real Applications** — fundamentals, data types, control flow, loops, functions, files, environments and an expense-tracker capstone.
- **AI Foundations and Prompt Engineering** — model basics, prompting, grounding, fact-checking, responsible use, workflows and a verified-assistant capstone.
- **Modern Web Development** — web foundations, accessible HTML, responsive CSS, JavaScript, forms, APIs, testing/security and a portfolio capstone.
- **Machine Learning and Data Science** — framing, data cleaning, statistics, visualisation, leakage-safe evaluation, model metrics, interpretability and an end-to-end project.
- **Backend Engineering, SQL and Secure APIs** — HTTP, schema design, SQL, API design, auth, security, testing/deployment and a secure API capstone.
- **AI Business Automation** — process mapping, workflow design, AI classification, integrations/webhooks, human approvals, privacy, monitoring and a safe automation capstone.

Each course contains practical examples, a learning objective/body, a knowledge check with explanations, and a capstone. Course access is managed by the backend; the first lesson in each course is a free preview.

## Requirements

- Node.js 22.5 or newer (uses the built-in `node:sqlite` module)
- No third-party runtime dependencies are required

## Run locally

```bash
cp .env.example .env
npm test
npm start
```

Open `http://localhost:3000`. The database defaults to `./data/skillora.db` for local development. **For production, `DB_FILE` must point to a persistent writable disk/volume provided by your host.** Do not store SQLite on an ephemeral deployment filesystem: redeploys, restarts, or new instances can otherwise appear to erase learner accounts and progress. Use one persistent database volume for the app instance, run backups, and test restore before upgrading. Database persistence protects accounts, enrolments, lesson progress, submissions, certificates and other records as long as deployments keep using the same database file. It does not automatically migrate data if you change database providers or paths.

Set `COOKIE_SECURE=true` behind HTTPS. Keep a copy of your current database before every deployment. The server applies additive schema changes at startup; avoid replacing the production database with the bundled development database.

Create or restore the owner/admin role using the provided script. Run it in the deployment environment with the **same `DB_FILE` path as the live app**:

```bash
DB_FILE=/path/to/persistent/skillora.db npm run create-admin -- owner@example.com 'Use-a-long-unique-password' 'Academy Owner'
```

Replace the example email, password, and path with your own. This sets the role to `admin` for the matching email (or creates that account); it does not recover a forgotten password for an existing account. Keep credentials private and never expose this command as a public website endpoint. After signing in, an account with the `admin` role sees **Admin dashboard** in the top navigation. If that button is missing, first confirm the account role in the same persistent database rather than creating a fresh database.

## Certificates

Students must be enrolled and complete every lesson in a course. From the course page or student dashboard, choose **Get certificate PDF** / **Issue certificate PDF**. The server issues a unique certificate ID and generates a one-page downloadable PDF. PDFs are only downloadable by the certificate owner (or an administrator). Public verification is available at `/api/verify/:code`.

The PDF generator uses only Node.js built-ins. It includes the learner name, course title, issue date and unique verification code. The certificate records course completion; it is not a government-accredited qualification unless the academy separately obtains and clearly states the relevant accreditation.

## Payments and production checklist

The checkout route intentionally does not grant access until a signed payment webhook is verified. Live M-Pesa/card gateway integration is not included by setting placeholder environment variables alone; configure a real provider adapter, verify its signatures and amount/currency, and test with provider sandbox credentials before accepting money.

Before public launch:

- Configure HTTPS, secure cookies, backups and a persistent database.
- Integrate and test a real payment provider and webhook signature scheme.
- Add account email verification and password recovery.
- Complete accessibility, privacy, security and load testing.
- Publish instructor/reviewer credentials, course policies, refund terms and support contact details.
- Confirm any claims about certificates, accreditation, employment or job placement are accurate.

## Tests

Run `npm test`. Tests cover the course catalogue, authentication, role restrictions, course access, quiz scoring, progress persistence, payment-webhook safeguards, certificate eligibility, PDF downloads and certificate ownership checks.

## Kenya course catalogue and launch plan

See [`docs/KENYA_COURSE_CATALOGUE_AND_LAUNCH_PLAN.md`](docs/KENYA_COURSE_CATALOGUE_AND_LAUNCH_PLAN.md) for the proposed Kenya-first catalogue, introductory KSh pricing, practical capstone projects, demand signals, and a 30-day launch plan. Prices are hypotheses to validate with paid purchases, not guaranteed market rates.

## Admin, assignments and learner support

- Admins can open **Admin dashboard** after signing in with an account whose role is `admin`. The dashboard includes summary counts, student/enrolment lists, course editing and lesson management, certificate listing, assignment feedback and support-ticket replies.
- Learners can submit PDF, plain text, PNG/JPEG or ZIP assignments up to 500 KB, receive instructor feedback, and create/reply to support tickets from My learning.
- Completion certificates are downloadable PDFs with unique verification codes at `/api/verify/:code`. They represent Skillora Academy course completion only and are not accredited qualifications.
- Read `docs/LAUNCH_CHECKLIST.md` before production release. Payment-provider integration still needs real provider configuration and sandbox validation before live transactions are enabled.

## Learner-outcome upgrade pack

This build adds a learner portfolio (private by default, public only by opt-in), admin-published opportunities, a moderated-by-admin publishing model for career listings, course discussion feed, enrolled-student reviews, guided study-tutor endpoint, achievements, team seat/invite records, coupon creation/validation endpoints, referral codes, admin analytics, certificate revocation records, and an audit log. It also adds a lightweight installable PWA shell with an offline fallback. Existing course, account, progress, payment webhook, assignment, support, and certificate features remain in place.

### Important integration boundaries

- **AI tutor:** without `OPENAI_API_KEY` this returns transparent guided study steps, not generated AI. The configured-key branch intentionally does not call an external provider yet; add and test a server-side provider adapter before advertising AI-generated answers. Never put a secret key in browser JavaScript.
- **Payments:** payment access remains dependent on verified server-side payment webhooks. A real M-Pesa/card provider account, production credentials, callback configuration, reconciliation and end-to-end sandbox/production tests are still required. Coupon validation is implemented as an endpoint but discounts are **not** applied to checkout yet; do not advertise coupon checkout until this is wired into server-side amount calculation and payment verification.
- **Business teams:** team and seat/invitation records work, but email invitations, per-team enrollment billing and team progress reporting require email delivery and billing workflows before they can be treated as complete.
- **Career board:** it starts empty by design; an admin must publish real opportunities. No fake listings or job/income guarantees are included.
- **Certificates:** codes can be verified and revoked; a scannable QR image is not yet embedded in the PDF. The verification URL is the supported route.
- **PWA/offline:** the public app shell can be cached. Account data, payments, course access and submissions still need a network; this is not full offline course synchronization.
- **Security/privacy:** public portfolio items are opt-in; student discussion content should be monitored. Before production, add abuse reporting/moderation, retention policy, privacy/terms pages, backups and restore drills, rate limiting for all new routes, and security review.

## New API routes

- `GET/POST/DELETE /api/portfolio[/:id]`
- `GET /api/opportunities`; admin `POST /api/admin/opportunities`, `PUT /api/admin/opportunities/:id`
- `GET/POST /api/discussions`; `GET/POST /api/reviews`
- `POST/GET /api/teams`; `POST /api/teams/:id/invite`
- `POST /api/ai-tutor`; `GET /api/achievements`; `GET /api/referral`
- Admin `GET /api/admin/analytics`, `POST /api/admin/coupons`, `GET /api/admin/audit-log`, `POST /api/admin/certificates/:code/revoke`
- `POST /api/coupons/validate`


## Additional learner support and quality tools
The upgraded source includes adaptive learning-path recommendations, mentor clinic booking, scholarship applications, business challenges, content safety reports, and a database-backed admin quality report. These are empty until real sessions, challenges, and decisions are entered; no fake opportunities or funded seats are seeded. The student dashboard exposes the learner workflows. Some administration workflows are API-only and need a visual admin interface before nontechnical staff can manage them.

### Database backups
Set `DB_FILE` to the persistent database path, then run `npm run backup`. It creates a consistent SQLite snapshot under `./backups` by default and checks its integrity. Set `BACKUP_DIR` to change the destination. Copy backups to secure off-site storage and test restoration; this command does not perform off-site replication.

### Explicit scope exclusion
This build uses an English-only interface (Swahili UI was removed by request).


## Retention and learner-growth features

The learner dashboard includes a personalized daily mission, real course progress, weekly targets, career tracking, study group creation, benefits, reminder preferences, weekly challenge discovery, and a referral link panel. Authenticated APIs also support project peer feedback, weekly challenge submissions, and admin retention analytics.

Useful endpoints:
- `GET /api/learner/home`, `POST /api/learner/mission/:id/status`, `PUT /api/learner/goals`, `GET /api/learner/milestones`
- `POST /api/portfolio/:id/feedback`, `GET /api/portfolio/:id/feedback`
- `POST/GET /api/study-groups`, `POST /api/study-groups/:id/join`
- `GET /api/weekly-challenges`, `POST /api/weekly-challenges/:id/submit`, admin `POST /api/admin/weekly-challenges`
- `GET /api/career`, `POST /api/career/goals`, `POST /api/career/applications`, `PUT /api/career/applications/:id`
- `GET/PUT /api/notification-preferences`, `GET /api/notifications`
- Admin `POST /api/admin/benefits`; learner `GET /api/benefits`, `POST /api/benefits/:id/claim`
- Admin `GET /api/admin/retention-analytics`, `GET /api/admin/referrals`, `PUT /api/admin/rewards/:id`

Set `PUBLIC_URL` to the academy's public origin if you want complete referral links. `REFERRAL_REWARD_KES` defaults to `0` (disabled). Configure a reward only after publishing terms and implementing a complete redemption/settlement workflow. Email, browser push and automated scheduled reminders need provider/worker setup and are not active merely because preferences are saved.

## Expanded career bootcamps

The course catalogue now includes additional seven-lesson bootcamps in AI productivity and automation, cybersecurity foundations, spreadsheet data analysis, UX/UI design, e-commerce operations, small-business bookkeeping, project management, video editing, customer support and remote work, cloud/DevOps, freelancing, and no-code automation. Each lesson includes practical guidance, an exercise or deliverable, and a knowledge check; each course ends with a capstone. Seven days is a guided study format, not a guarantee of mastery or employment. Learners should complete the practical work and assessment before presenting a skill as job-ready.

## Academy quality standard

See `docs/SKILLORA_EXCELLENCE_UPGRADE.md` for the course-quality rubric, learner success loop, job-listing integrity, revenue safeguards, button-by-button acceptance criteria, owner controls and release gates. Treat items marked as future implementation requirements as planned work until confirmed by tests.


## AI tutor configuration

The tutor uses a server-side OpenAI Responses API adapter when `OPENAI_API_KEY` is configured. Set `OPENAI_MODEL` to a model enabled for your API account. Never put the API key in frontend files or commit it to source control. Without a key, the endpoint clearly falls back to guided study steps rather than pretending the answer is AI-generated. The endpoint applies a per-user rate limit, a 20-second request timeout, and generic provider error messages. Usage can incur API charges; set account limits and monitor usage before public launch.

## Important production boundary

This package integrates the existing learner career tracker, admin-published opportunity board, portfolio, study groups, practical challenges, learning missions, referral tracking, benefits, analytics, certificates, course administration and payment-webhook safeguards. It does not magically create a live job feed or verify external employers; an admin must publish real opportunities and check them. Live M-Pesa/card processing, automated recurring subscription billing, external email/SMS delivery, and full end-to-end browser/accessibility/security/load tests still require provider setup and additional implementation/testing. The supplied tests are API/backend tests, not proof that every deployment-specific workflow is production-ready. Existing user data is only preserved if the upgrade is applied to the same persistent database using compatible schema migrations; keep a verified backup before deployment.


## Integrated career and marketplace upgrade

See [`docs/INTEGRATED_UPGRADE_2026.md`](docs/INTEGRATED_UPGRADE_2026.md) for new career applications, employer verification, moderated freelance gigs, instructor applications, membership requests, admin moderation and explicit production-integration limits.

## Skillora Excellence modules (added in this source upgrade)

The learner dashboard now includes a **Skill Passport** (private by default; learner-controlled public sharing), **Practical Practice Labs** with saved submissions, a **Career Path Planner** that recommends existing published courses using transparent rules, and a **Report a Course Issue** form. Admin API endpoints provide course-quality reports and completion/enrolment summaries. These additions use additive SQLite tables and do not intentionally delete existing learner records.

### New endpoints

- `GET /api/practice-labs` — curated practical briefs and the signed-in learner's own saved submission.
- `POST /api/practice-labs/:key/submit` — save or update a learner submission; optional project URL must use HTTPS.
- `GET /api/skill-passport` — authenticated learner's certificates, public projects and recorded skill assessments.
- `POST /api/skill-passport/share` — enable/disable public access. Public sharing is off until the learner enables it.
- `GET /api/skill-passport/:token` — read-only public passport; only enabled passports are returned.
- `POST /api/career/plan` — create a rules-based starter career plan and recommended published courses; it is not represented as AI-generated.
- `POST /api/courses/:id/report` — submit a course quality/accessibility/content report.
- `GET /api/admin/course-quality` and `PUT /api/admin/course-quality/:id` — admin-only course quality analytics and report workflow.

### Production limitations to resolve before launch

- The career planner is rules-based; configure a real AI provider before advertising it as an AI career agent. The existing AI tutor also needs a server-side provider key.
- Practice labs save learner work but do not execute arbitrary code or automatically grade every submission. Instructor feedback requires the review workflow to be staffed and tested.
- The public Skill Passport endpoint returns JSON; a polished human-readable public profile page and search-engine preview are still a separate frontend task. Set `PUBLIC_URL` to return absolute share links.
- Job listings need real, verified employers and ongoing moderation. No external job feed or guaranteed job placement is included.
- Real recurring billing, M-Pesa/card provider setup, refund handling, freelance escrow/payouts/disputes, instructor revenue share and external email/push delivery require provider configuration and production verification.
- Automated tests are not a substitute for full browser, accessibility, penetration, backup-restore and live payment testing.

Before deployment, back up the persistent database and deploy against the same database file/volume. Never replace production data with a fresh empty database. The live website is not changed by generating this ZIP.


## Production data persistence and owner access

- Configure `DB_FILE` to an absolute path on a persistent volume supplied by your host (for example, a mounted persistent disk path). The exact path depends on the hosting provider.
- Confirm the app process can read/write the file and its parent directory. Keep the same `DB_FILE` across deploys.
- Before deploying, run `npm run backup` with the live `DB_FILE` and confirm the backup is stored somewhere durable. Do not rely on a backup folder on an ephemeral disk.
- After deployment, sign in with the owner account, open **Admin dashboard**, inspect learner/course counts and verify a test learner's saved progress survives a restart/redeploy.
- Do not promote arbitrary accounts to admin. Use a controlled deployment shell/console, strong unique password, HTTPS and restricted operator access.
- The owner dashboard is hidden from regular student accounts by design. If the current owner account is marked `student`, run the admin script against the existing production database; do not create a replacement database.


## Owner Control Center access

Open `/admin` and sign in with an admin account. Set `OWNER_EMAIL` + `OWNER_PASSWORD` in the environment to guarantee an owner account at startup. Details: [`docs/CONTROL_CENTER.md`](docs/CONTROL_CENTER.md).
