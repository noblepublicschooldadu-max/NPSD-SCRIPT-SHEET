# School Pilot Checklist — SEF Primary School Management System

**Default decision: NO-GO until all mandatory items are verified.** Use synthetic records only until the school authorizes production-data migration in writing. Do not enter actual student personal information while the API remains `503 NOT_CONFIGURED`.

## A. School-approved information

- [ ] Confirm official school name, approved logo, address, phone, public email and public website content.
- [ ] Approve academic year start/end dates, timezone (`Asia/Karachi` unless the school approves otherwise), working days, attendance statuses and bell schedule.
- [ ] Approve class levels 1–8, official section names, subject list, teacher assignments and class capacities.
- [ ] Approve required student fields and guardian fields; remove unnecessary collection.
- [ ] Approve admissions required fields, consent text, application retention and rejection/withdrawal policy.
- [ ] Approve result review, correction, publication and unpublishing procedures.
- [ ] Approve public-notice categories and which fields may be public.
- [ ] Approve retention/deletion periods for applications, student records, photos, attendance, results, audit logs and backups.

## B. Environment and deployment

Required names only; no values belong in this document:

- [ ] `GOOGLE_APPS_SCRIPT_API_URL` — only for explicitly public integration use; do not treat it as a private authenticated backend.
- [ ] `SCHOOL_BACKEND_SERVER_URL` — future server-only endpoint; must be reviewed before enabling.
- [ ] `SCHOOL_BACKEND_SHARED_SECRET` — future server-only secret; use a supported secret manager, rotate it and never expose it to browser code.
- [ ] Confirm production and preview Vercel environment variables are separated and no private value uses a `NEXT_PUBLIC_` prefix.
- [ ] Confirm production API URL, domain, HTTPS, redirects, security headers and cache behavior from the deployed response.
- [ ] Confirm preview deployments do not access production Sheets or Drive.
- [ ] Generate/commit a package lockfile and record the runtime/dependency versions.
- [ ] Verify no secrets, service-account files, exports or real student records are tracked in source control or bundled into the browser.
- [ ] Confirm no production deployment or environment changes are made until authorized by the school.

## C. Google Apps Script, Sheets and Drive

- [ ] Review source for every `doGet`, `doPost` and operation dispatcher; record auth, role, validation, response shape and side effects.
- [ ] Deploy a dedicated test Apps Script version using synthetic records and a test spreadsheet.
- [ ] Confirm the execution identity and the minimum required Google account permissions.
- [ ] Confirm workbook and Drive folder sharing are restricted to authorized school/technical accounts; disable public-link access for private data.
- [ ] Verify clients cannot supply arbitrary spreadsheet IDs, tab names, roles, user IDs or record ownership.
- [ ] Version and approve the Sheet schema manifest; compare headers/types to application contracts before any migration.
- [ ] Test server-side validation, locking, idempotency, audit events, quota failures and partial failures.
- [ ] Confirm uploads have size/type allowlists and server-chosen restricted destinations.
- [ ] Confirm downloads enforce audience and record ownership; test denied access directly.
- [ ] Verify Apps Script deployment changes and rollback procedure.

## D. Accounts and permissions

- [ ] Provision the first Admin through an approved, out-of-band process; no default/public Admin credentials.
- [ ] Require unique credentials and an approved recovery channel; test recovery tokens, expiry and one-time use.
- [ ] Provision teachers only after identity and employment/assignment checks.
- [ ] Activate student access only through a verified school process; never create a login solely from a public registration request.
- [ ] Test anonymous, Admin, Teacher and Student roles with separate synthetic identities.
- [ ] Verify students cannot read another student's profile, attendance, homework or results.
- [ ] Verify teachers can access only assigned classes/subjects and permitted actions.
- [ ] Verify results publication, attendance corrections, admission review and backup/restore are server-authorized.
- [ ] Verify session expiry, logout invalidation, invalid session handling and safe error messages.

## E. Synthetic data import and reconciliation

- [ ] Prepare a synthetic dataset representative of approximately 1,000 students across classes 1–8.
- [ ] Check required fields, date formats, class/section references and unique identifiers.
- [ ] Detect duplicate student/guardian records and duplicate application references.
- [ ] Validate GR/Seat Numbers with school-approved uniqueness rules; do not infer identifiers.
- [ ] Compare imported counts, rejected rows and field-level exceptions to a signed import report.
- [ ] Verify rollback or restore of the test import before any production migration is approved.
- [ ] Obtain written approval for source data, destination, timing, access scope and rollback plan before production import.

## F. User acceptance workflows

- [ ] Admission: submit, review, approve/reject, duplicate prevention, conversion and audit trail.
- [ ] Classes: create academic year, classes/sections, assign teacher/subject and enroll student.
- [ ] Attendance: mark all supported statuses, submit, retry, reconnect, reconcile pending entries and exclude unmarked sessions from totals.
- [ ] Homework: create assignment, target correct class/subject, restrict student visibility and verify attachment permissions if enabled.
- [ ] Exams/results: validate marks and maxima, handle missing marks, review, publish, and block unpublished-result direct API access.
- [ ] Timetable: detect teacher/class conflicts, publish and filter correctly for teacher/student.
- [ ] Notices: confirm public versus class-specific audience targeting and publication permissions.
- [ ] Reports: reconcile every total to the test dataset, verify filters and formula-safe CSV exports.
- [ ] ID cards: verify only approved fields and ensure QR codes disclose no private information; test token expiry/revocation if enabled.
- [ ] Backup/restore: create a verified backup, restore to an isolated target, compare counts/checksums, test incompatible restore and retain evidence.
- [ ] Error handling: simulate backend unavailable, invalid JSON, permission denied, duplicate submit and partial write.
- [ ] Mobile/RTL: Android-sized viewport, desktop, keyboard navigation, focus visibility, contrast, long Urdu/Sindhi labels and form validation.
- [ ] Performance: record test dataset size, concurrency, timings, failures and Apps Script execution limits. Do not test load against production without authorization.

## G. Training, monitoring and incident response

- [ ] Train office/Admin staff on admissions, student data corrections, reports, results publication and data privacy.
- [ ] Train teachers on attendance, offline/pending states, homework and marks review.
- [ ] Publish a staff contact for reporting errors and suspected data exposure.
- [ ] Define incident severity, escalation, evidence preservation, credential/session revocation and school notification responsibilities.
- [ ] Monitor API error rate, 503/401/403/429/5xx responses, Apps Script exceptions, quota failures and backup age without logging full personal records.
- [ ] Define who can approve restores and who independently verifies recovery.
- [ ] Document restore steps and confirm a backup can be accessed only by authorized recovery staff.

## H. Final go/no-go approval

- [ ] Security reviewer signs off authentication and backend RBAC evidence.
- [ ] QA signs off all mandatory end-to-end workflows in the isolated environment.
- [ ] Technical owner signs off build, typecheck, lint, dependency audit and deployment configuration.
- [ ] Data owner signs off schema, migration reconciliation and privacy/retention policy.
- [ ] School leadership approves pilot scope, participants, dates, support owner and rollback criteria.
- [ ] Isolated restore drill passed with evidence.
- [ ] No unresolved Critical/High security findings remain.
- [ ] Pilot dataset and production dataset are demonstrably separated.
- [ ] Written go/no-go decision and named approvers recorded.

**Current project state:** NO-GO. Authentication, Apps Script, Sheets and Drive integrations are not configured in the supplied repository; API routes fail closed with `503 NOT_CONFIGURED`. Backup/restore has not been tested. Do not import real student records yet.
