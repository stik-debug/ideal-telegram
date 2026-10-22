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
