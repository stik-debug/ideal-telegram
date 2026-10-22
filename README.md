# SkillForge Academy

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

Open `http://localhost:3000`. The database defaults to `./data/skillforge.db`. For deployment, configure a persistent writable database path and set `COOKIE_SECURE=true` behind HTTPS.

Create the first administrator using the provided script:

```bash
npm run create-admin
```

Follow the prompts and keep administrator credentials private.

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
- Completion certificates are downloadable PDFs with unique verification codes at `/api/verify/:code`. They represent SkillForge Academy course completion only and are not accredited qualifications.
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
