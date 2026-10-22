# SkillForge Academy upgrade status

## Implemented in this source package
- Student portfolio projects, privacy default and opt-in public visibility.
- Opportunity board backed by admin-published records; empty until real opportunities are entered.
- Learner discussion feed, enrolled-student course reviews.
- Guided study tutor endpoint with transparent non-AI fallback.
- Achievement badges and study-day summary derived from real progress records.
- Business team creation, seat limits and invitation records.
- Coupon creation and validation endpoints, referral code records.
- Admin analytics based on database records and admin audit log.
- Certificate revocation endpoint and verification status.
- Installable PWA manifest, service worker shell cache and offline fallback page.
- Existing admin, student support, assignments, lesson progress, payment verification and certificate PDF functionality retained.

## Not yet production-complete (do not claim otherwise)
- Live AI answers: external provider adapter and API key are not wired.
- Live M-Pesa/card payment provider: requires provider account, credentials, callback setup and end-to-end payment tests. Existing webhook validation remains the gate for paid access.
- Coupon discount application at checkout and redemption accounting.
- Invitation email delivery and complete team billing/progress management.
- QR code embedded in certificate PDFs.
- Full offline lessons/account sync, external employer portfolio views, business-project partner integrations, refund workflows, automated backups/restore drills, and full abuse moderation.

## Release gate
Run `npm test`, then test signup/login, locked paid lesson access, payment callback signatures and duplicate events, mobile navigation, file upload restrictions, student/admin authorization, certificate issue/revoke/verify, and database backup/restore on a staging deployment. Do not deploy to the live site until the owner reviews and approves this ZIP.
