# Skillora Academy — Excellence Upgrade Pack

This pack defines the quality bar for every course and learner workflow. It complements the existing app; items marked **next implementation** are requirements, not claims that the current code already performs them.

## 1. The learner success loop

1. Onboarding diagnostic: learner chooses a goal, current level, weekly availability, device/access constraints and preferred learning style.
2. Recommend a pathway using published courses and the diagnostic. Explain why each course is recommended; allow the learner to change it.
3. Daily mission: one measurable objective, short lesson, guided practice, independent task and knowledge check.
4. Retrieval practice: revisit key concepts after 1, 3 and 7 days; let learners retry without shame.
5. Practical project: a realistic brief, starter assets, acceptance criteria, rubric, submission and revision loop.
6. Evidence of skill: assessment result, project artifact and rubric feedback. Certificates must state exactly what was completed and must not imply accreditation.
7. Career action: translate the project into a portfolio entry and suggest a relevant next step such as a CV bullet, application or freelance proposal.

## 2. Course quality standard

Every course must contain:
- Explicit prerequisites and a realistic time estimate.
- Measurable outcomes written as observable actions.
- Original lesson content, examples, exercises and answer explanations.
- At least one independent practical task per learning day.
- A final project with rubric and clear pass criteria.
- Accessibility checks, captions/transcripts where video is used, keyboard support and mobile readability.
- Version, author/reviewer, last-reviewed date and links to sources for fast-changing material.
- A maintenance owner and review date. Flag stale material rather than presenting it as current.

### Seven-day design
Day 1 foundations and baseline; Day 2 guided practice; Day 3 independent practice; Day 4 project build; Day 5 testing and revision; Day 6 assessment and explaining decisions; Day 7 project presentation and next-step plan. A seven-day course is a focused introduction, not a guarantee of mastery, income or employment.

## 3. Skills pathways to build out

Prioritize content in these families based on actual learner demand and instructor capacity:
- Software: web foundations, JavaScript, Python, APIs, Git, testing, databases, cloud basics and secure deployment.
- Data: spreadsheets, SQL, statistics, dashboards, data storytelling and responsible AI-assisted analysis.
- AI: prompt design, output verification, workflow automation, privacy, evaluation and human oversight.
- Business: bookkeeping, business operations, project coordination, customer support, sales and CRM fundamentals.
- Digital work: UX/UI, graphic design, video editing, content production, digital marketing and e-commerce.
- Work readiness: professional writing, remote collaboration, portfolio storytelling, CVs, interviews and freelance client delivery.
- Security: cyber hygiene, phishing defence, account protection and privacy fundamentals; no harmful intrusion instructions.

Do not publish empty catalogue shells as complete courses. A course is publish-ready only when all required lesson content, exercises, assessment criteria and final project have been reviewed.

## 4. Career services and job integrity

- Job listings need source, employer identity, location/remote status, requirements, posting date, expiry date and a working application URL.
- Show “unverified” until the employer and listing have passed a defined review. Expire stale listings automatically once a scheduler is implemented.
- Never guarantee placement or imply a course guarantees employment.
- Track applications, interview stages and learner-reported outcomes separately; distinguish verified outcomes from self-reported outcomes.
- CV exports must use the learner's actual data, allow editing, and never invent credentials or experience.
- Interview practice should provide transparent rubrics and coaching, not claim to predict hiring decisions.

## 5. Revenue model with learner trust

Use clearly priced free introductions, single courses, related bundles, guided bootcamps, optional mentor reviews and business/team seats. Display full price, access period, refund terms and what is included before payment. Provide a receipt after provider-confirmed payment. Never unlock paid content based only on a client-side success message.

Track gross sales, verified payments, refunds, payment fees and net revenue separately. Track acquisition cost and course completion alongside revenue so growth does not reward low-quality courses. Referral rewards should require server-verified qualifying activity, fraud checks and auditable admin approval.

## 6. Button and workflow acceptance standard

For every visible control, document: intended action, authorized roles, validation, API route, database change, loading state, success state, failure state and automated test. Remove or disable controls whose action is not implemented. Do not use success toasts before the server confirms the operation.

Critical end-to-end journeys:
- Register → verify/secure account → enrol → pay via configured provider → unlock → study → submit project → receive feedback → pass assessment → download certificate.
- Owner login → create/edit course → preview → publish → suspend → confirm student access policy → audit action.
- Learner profile → CV draft → edit → export → portfolio project → job listing → external application → track stage.
- Referral link → new learner attribution → qualifying verified payment → fraud checks → admin review → reward ledger.

## 7. Owner command centre

Expose only server-authorized admin controls. Provide course content readiness, learner engagement, course completion, assessment performance, payment/reversal summaries, stale job listings, support backlog, errors and employment outcomes. Label each metric's source and date range. Never show fabricated counts. Record who changed prices, publication state, access, refunds or rewards and when.

Course suspension must be explicit: unpublishing prevents new enrolments; an owner-controlled access suspension may restrict enrolled learners only after clear policy, notification and audit requirements are implemented. Never delete learner work when suspending a course. Handle paid learners and refunds according to published terms and applicable law.

## 8. Security, accessibility and reliability gate

Before production: enforce server-side authorization on every protected route; rate-limit authentication and submissions; validate uploads and file sizes; use secure session/cookie settings; protect secrets in environment variables; implement backups and restoration drills; add error monitoring; test keyboard navigation, contrast, screen-reader labels and small-screen layouts; test payment webhooks for signatures, idempotency and replay; and run dependency/security checks.

## 9. Outcome metrics

Report cohorts by enrolment week and course: activation, day-7 return, lesson completion, assessment pass rate, project submission, project rubric score, course completion, repeat purchase, refunds, interview invitations and verified/self-reported employment outcomes. Show denominators and time windows. Do not optimize for vanity enrolment counts alone.

## Release note

This document is the quality and product specification for the next implementation stage. A written specification does not mean all these integrations or UI workflows are implemented. Confirm actual completion with route-level tests and browser end-to-end tests before launch.
