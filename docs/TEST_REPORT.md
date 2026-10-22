# Automated Test Report

Latest local run: 8 test groups passed, 0 failed (`npm test`).

Coverage includes:
- Health endpoint and course catalogue.
- Registration validation and login.
- Admin-only access controls and course price updates.
- Lesson access, quiz scoring and persisted progress.
- Payment webhook signature, amount validation and duplicate-event handling.
- Completion certificate PDF generation, unique code verification and download privacy.
- Admin overview, lesson management, support-ticket privacy and threaded replies.
- Assignment upload, access privacy, instructor feedback and status updates.

Limitations: these are automated API tests on a local test database. They do not establish that live M-Pesa/card payment processing is configured, do not replace visual testing across physical devices, and do not certify accessibility conformance. Use `LAUNCH_CHECKLIST.md` for staging verification.
