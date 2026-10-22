# Skillora Academy upgrade status

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


## Additional upgrades in this package (2026-10-22)
- Adaptive learning-path API and student dashboard view based on actual saved progress and assessment records.
- Mentor clinic publishing/booking with capacity enforcement.
- Scholarship applications with pending/approved/declined review states and audit trail; applications explicitly do not guarantee funding.
- Admin-published business challenges and learner applications, with admin shortlist/decline workflow.
- Learner safety-report form and admin report-review API.
- Admin quality report with real database counts for active learners, quiz performance, refunds, support, reports, scholarships and clinics.
- Verified SQLite snapshot backup command: `npm run backup` (requires `DB_FILE` to point at the persistent database; set `BACKUP_DIR` to choose the output folder).
- Student dashboard controls for learning path, scholarship application, mentor clinics, business challenges and content reports.
- No Swahili-language support was added.

## Still requires real integrations / owner operations
- A real AI-provider adapter and server-side API key; current tutor is transparent guided fallback without that adapter.
- M-Pesa/card gateway account, credentials, verified callbacks, coupon redemption at checkout, refunds and reconciliation. Never enable paid access based only on a browser success message.
- Email delivery for team invitations, notifications and password recovery.
- QR images in certificate PDFs, external employer views with consent, full offline lesson sync, automated abuse moderation, and mentor/business partners who actually supply sessions or challenges.
- Admin APIs exist for publishing clinics/challenges and reviewing reports/scholarships; the current admin screen does not yet expose every management workflow as a visual form. Use authenticated API tooling or complete that admin UI before handing these operations to nontechnical staff.
- Production backup retention/off-site copy and a tested restore drill are operational requirements; the backup command creates a local verified snapshot but does not upload it off-site automatically.


## Retention and learner growth suite (2026-10-22)

### Implemented in source
- Learner homepage API and dashboard panel with a persisted daily mission selected from actual incomplete lessons or portfolio work.
- Learner weekly target and career goal preferences; milestone awards and learning-day/streak summary derived from persisted events.
- Portfolio feedback endpoint with rubric scores and privacy checks for private projects.
- Study group creation, membership listing, public-group joining and owner/admin member removal.
- Weekly challenge publishing and submissions; admin-created challenges are real records and are not seeded.
- Career goal and application tracker plus recommendations for published courses not yet enrolled in.
- Notification preferences, quiet hours, in-app notification listing, learner benefits publishing/claiming, and dashboard forms.
- Referral attribution at registration, qualifying payment attribution only after verified payment webhook, reward ledger, admin approval/rejection/reversal, and referral analytics. Reward creation is disabled by default unless `REFERRAL_REWARD_KES` is configured; shareable full links require `PUBLIC_URL`.
- Retention analytics based on learning events, signups, referrals and actual course progress. Students are blocked from admin analytics.
- Added tests for the retention suite; all 9 test groups pass locally.

### Important limits / integration requirements
- This package is not deployed. Live site and live database were not changed.
- The homepage and learner workflows are exposed in the student dashboard, but study-group invitations and full group messaging are not implemented yet; public group joining is available.
- Peer feedback is available for public portfolio projects; richer reporting/moderation UI and instructor assignment workflow need more work before large-scale public use.
- Weekly challenges have submission endpoints and admin publishing API; scoring/review UI is still an admin workflow gap.
- Referral rewards are pending admin review. Automatic credit redemption at checkout is not implemented. Configure a non-zero reward only after defining terms, refund windows, budget and a secure redemption process.
- Notification preferences and in-app queue storage exist, but a production scheduler/worker and email/push provider adapters are still required for automatic delivery. No external messages are sent by this package.
- Career recommendations are a transparent baseline (published courses not yet enrolled in), not an AI-based or labor-market-verified recommender. Career opportunities must be published from genuine sources.
- Retention metrics currently use available event timestamps and the application's UTC date conventions. Before production, standardize timezone handling, add cohort-specific week-1/week-4 definitions, and audit data retention/privacy requirements.
- No Swahili support was added.
