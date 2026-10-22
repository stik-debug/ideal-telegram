# Test report

Run date: 2026-10-22 (runtime environment)

- `node --check backend/server.js`: passed.
- `node --check public/app.js`: passed.
- `npm test`: 8 test groups passed, 0 failed (existing automated suite).
- Schema startup / seeded catalogue / health / opportunities route smoke test: passed.

Coverage includes health/catalogue, registration/login, student-vs-admin access, lesson access and progress, signed payment webhooks and duplicate handling, certificate completion/verification, admin course/support behavior, and assignment upload/review privacy.

Limitations: the existing automated suite does not yet test every new route, all browser layouts, physical mobile devices, accessibility, provider sandbox payments, production deployment, full offline behavior, or restore-from-backup. Those remain release-gate checks.

## Retention suite update — 2026-10-22
- Backend syntax check: passed.
- Frontend JavaScript syntax check: passed.
- Automated tests: 9 test groups passed, 0 failed.
- New coverage: learner mission/home data, weekly goal persistence, reminder preference persistence, career goals/applications, study group creation, referral attribution, and admin analytics authorization.
- Not covered by automated tests: real browser visual/accessibility behavior on physical devices, production payment provider, external email/push delivery, reward redemption at checkout, scheduled notification worker, production backup restoration and live hosting configuration.
