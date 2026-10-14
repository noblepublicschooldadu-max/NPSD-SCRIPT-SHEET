# SEF Primary School Website — Phase 3 foundation

Responsive public-facing school website plus a **fail-closed authentication and student registration UI/API foundation**. Built with Next.js App Router, TypeScript, and Tailwind CSS v4. Google Apps Script is the intended backend and Google Sheets the restricted structured store. No Supabase, Firebase, or other database is used.

## Public routes
`/`, `/about`, `/classes`, `/teachers`, `/notices`, `/gallery`, `/admissions`, `/contact`.

## Phase 3 routes
- `/login`: school-issued email/username and password UI; no credentials are stored in local storage or cookies by the frontend.
- `/register`: student registration request with client and server validation. It does not create or save a request while the backend is unconfigured.
- `/forgot-password`: validated recovery request UI. It does not send email or change a password.
- `/admin`, `/admin/*`, `/teacher`, `/teacher/*`, `/student`, `/student/*`: access-denied placeholders until real backend authentication and server-side role authorization are implemented.
- `/api/auth/login`, `/api/auth/recovery-requests`, `/api/registration-requests`: same-origin route handlers validate payloads, return `503 NOT_CONFIGURED` for valid submissions, and never pretend success.

## Authentication and security status
**Authentication is not operational.** No account lookup, password verifier, password hash storage, session issuance/validation/revocation, recovery delivery, registration persistence, duplicate check, registration approval, or audit log has been implemented. The role pages deny access by default; they are not substitutes for server-side authorization. The browser does not send credentials directly to Google Apps Script.

The same-origin API handlers enforce JSON input, a request-size limit based on `Content-Length` when supplied, server-side field validation and normalization, structured error responses, and no-store response headers. These are basic safeguards, not rate limiting or a complete security boundary. A client can omit `Content-Length`, so production infrastructure must also enforce request body limits.

Read [`API-CONTRACT.md`](./API-CONTRACT.md) before implementing the Google Apps Script backend. It defines the API envelope, registration lifecycle, server authorization requirements, private Sheets schema, and required security decisions. Apps Script web apps do not natively set HttpOnly cookies for a Vercel origin; do not implement direct browser-to-GAS password login. The recommended direction is a same-origin Next.js server-side BFF with secure HttpOnly cookies and a separately authenticated server-to-server connection to Apps Script. Do not put private keys or shared backend secrets in `NEXT_PUBLIC_*` variables.

## Private Sheets contract
`API-CONTRACT.md` describes `RegistrationRequests`, `UserAccounts`, optional `Sessions`, `RecoveryTokens`, and `SecurityAudit`. Restrict the spreadsheet, Apps Script project and Drive files to authorized school operators. Never publish a sheet. Never store plaintext passwords, raw session tokens, or raw recovery tokens. Admin accounts must be provisioned out-of-band through a controlled process; there is no public admin registration route.

## Local development
Requires Node.js 20.9+. Run:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Available checks:

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

`.env.example` contains placeholder configuration only. `GOOGLE_APPS_SCRIPT_API_URL` remains a public website/API placeholder and is not a credential. The Phase 3 auth UI intentionally uses same-origin `/api/*` routes instead of sending passwords to Apps Script.

## Localization and content
English is the default; the shared UI includes English, Urdu, and Sindhi language handling. Have translations reviewed by fluent speakers before production. Official school identity, staff records, contacts, images, notices and achievements remain generic until verified material is provided.

## Known limitations / production gate
- Registration is UI-only until Apps Script persistence, concurrency-safe duplicate prevention, receipt/status secret issuance, and admin verification are implemented.
- Login is UI-only until a vetted password hashing and secure session architecture is implemented and independently reviewed.
- Password recovery is UI-only until a verified delivery provider and single-use, expiring reset-token validation are implemented.
- Backend-only security properties (duplicate races, pending account denial, role enforcement, admin-only approval, rate limits, CSRF, revocation, audit integrity) cannot be proven by frontend tests; test them against a real backend before launch.
- No dashboard, attendance, ID-card flow, or account provisioning UI is included in this phase.


## Phase 4 — Admin dashboard status

The `/admin` dashboard and all requested `/admin/*` routes are implemented as a responsive workspace with shared navigation, loading/error/unavailable states, retry controls and search/filter inputs for record-oriented sections. Overview metrics, notices, activity and tasks are displayed only from a verified API response; no demo records or fake totals are supplied.

**Backend unavailable / fail-closed.** `/api/admin/*` returns `503 NOT_CONFIGURED` until secure server-side session verification and the reviewed Google Apps Script integration exist. No admin reads/writes, CRUD, registration approval, ID-card generation, attendance, homework, examinations, results, notices, admissions, exports, audit logs or settings mutations are claimed to work. Protected portal access remains denied. Read `API-CONTRACT.md` for the required operation contracts.

Before production, configure and review the server-side BFF, `HttpOnly; Secure; SameSite` session cookies, role checks on every request, CSRF/origin protections, server-side validation, restricted Sheets access, `LockService` duplicate/conflict protection, audit writes, quotas/rate limits, and registration approval. Never expose spreadsheet IDs, Apps Script secrets, sheet contents or role assertions to the browser. Admin identities must be provisioned through a controlled school process. Search controls are ready for future live records but do not filter nonexistent records. No private records are stored in local storage, approvals simulated, or fake exports generated.

## Phase 5 — Teacher Portal status

Implemented responsive routes: `/teacher`, `/teacher/classes`, `/teacher/attendance`, `/teacher/homework`, `/teacher/examinations`, `/teacher/results`, `/teacher/notices`, and `/teacher/profile`. The portal shares the site's existing Next.js App Router, TypeScript and Tailwind CSS foundation and uses same-origin API calls without storing bearer tokens in browser storage. It includes explicit empty/unavailable states, mobile navigation, roster search UI, explicit attendance status selection and review-before-submit flow, homework form validation, and marks range validation preview. It never seeds fake classes, students, marks, timetable entries, attendance, homework or notices.

**No teacher operation is connected to a working backend.** `/api/teacher/*` deliberately returns `503 NOT_CONFIGURED` because this repository still has no secure server-side session verifier, trusted server-to-server Apps Script channel, or configured school Sheets API. Therefore, live dashboards, assigned rosters, attendance writes, homework persistence, examination/marks drafts and submission, results, notices and profile reads/edits are unavailable. Attendance and homework forms cannot report a successful save unless a future configured API confirms it. Marks entry is disabled without a verified exam, maximum and eligible roster. The UI's marks validation preview is not a record and does not save data.

Before production, implement and independently review the session/BFF and trusted Apps Script channel; enforce teacher role and class/subject assignments on every request; configure restricted Sheets/Drive access; implement `LockService` idempotency, duplicate prevention, correction history and audit logging; add CSRF/origin policy, quotas/rate limits, bounded pagination, upload allowlists and session revocation; provision staff accounts through the school; and test against real backend concurrency and authorization cases. See the Phase 5 contract in `API-CONTRACT.md`. No Supabase or Firebase is used.

## Phase 6 — Student Portal status

Implemented responsive routes: `/student`, `/student/profile`, `/student/attendance`, `/student/id-card`, `/student/homework`, `/student/timetable`, `/student/results`, `/student/notices`, and `/student/settings`. The portal reuses the shared language selector and applies RTL layout for Urdu and Sindhi locales; the main student navigation, page titles and basic states have English, Urdu and Sindhi labels. Untranslated detailed help copy remains in English and needs a fluent-language review. The UI uses a mobile sidebar, loading/error states, no-store same-origin API requests, an honest empty state, a read-only attendance summary, published-result filtering, and a print-only card preview when the backend returns a fully approved and verified ID-card record.

**No Student Portal operation is connected to a working backend.** `/api/student/*` returns `503 NOT_CONFIGURED` because secure server-side session verification, session-derived student identity, and a trusted server-to-server Apps Script channel have not been configured. Dashboard/profile/attendance/homework/timetable/results/notices/settings are unavailable; ID-card preview is unavailable until the school returns approved data. QR verification is intentionally disabled, no PDF download is claimed, no assignments can be submitted, and account/password settings remain unavailable. The existing authentication and recovery UI is not operational until its backend is implemented.

Before deployment, configure the server-side BFF and HttpOnly/Secure/SameSite session cookie; enforce current-student-only authorization and published-result filtering in every Apps Script operation; restrict Sheets and Drive; implement bounded reads and quota handling; validate photo/attachment access; and test session expiry, cross-student access denial, and private-record leakage against the real backend. No Supabase or Firebase is used.

## Phase 7 — Digital Student ID Card System

### Routes and current behavior

- `/admin/id-cards`: ID-card management workspace with search, class/section/academic-year filters, eligible-record guard, selection UI, print preview, and disabled generation/replacement actions while the backend is unavailable.
- `/student/id-card`: displays a card only if the Student Portal API returns an approved and verified record; includes status messaging and print preview. Replacement requests remain unavailable.
- A public `/verify-card/[token]` route is intentionally **not exposed** until an authenticated backend can securely validate opaque tokens and disclose only approved minimal information.

### Card dimensions and design

- Intended physical card size: ISO/IEC ID-1, 85.6 × 54 mm.
- Preview includes front and back with explicit placeholders for school logo, official school details, photo and QR verification. Placeholders are not official branding or a claim of issuance.
- Print layout is for review only. Browser print may offer a “Save as PDF” destination, but downloadable PDF generation has not been implemented or verified. Bulk PDF generation for approximately 1,000 records is not enabled.

### Google Apps Script / Sheets / Drive setup

See `API-CONTRACT.md`, section “Phase 7 — Digital Student ID Cards and QR Verification”, for the proposed `StudentIdCards` and `IdCardAudit` columns and required operations. The frontend currently receives `503 NOT_CONFIGURED` from protected API handlers. Before enabling operations, configure server-side session/role validation, trusted server-to-server Apps Script access, approved `SchoolSettings`, private Drive photo storage, token hashing/rotation/revocation, concurrency locks, idempotency, and audit logging. Never put Apps Script secrets, spreadsheet IDs or Drive credentials in browser code.

### Security and limitations

- No real card issuance, revocation, replacement, QR token generation, public QR verification, photo upload, downloadable PDF or batch job is currently connected.
- No fake student records or school branding are used.
- Frontend photo validation is only an early guard; the backend must validate file signatures and decode/re-encode images.
- Admin selection/preview controls are not authorization. The trusted backend must independently verify role, enrollment, record ownership, duplicates and all mutations.

### Phase 7 verification snapshot

- `node --test tests/*.test.cjs`: 41 tests passed, 0 failed.
- Isolated strict TypeScript check for `src/lib/id-cards/contracts.ts`: passed.
- TypeScript/TSX transpilation syntax scan: 48 files, 0 syntax errors.
- `npm run lint`: could not run because dependencies are not installed (`eslint: not found`).
- `npm run typecheck`: blocked by missing Next.js/React and Node type packages (`next`, `react`, `@types/node`).
- `npm run build`: blocked because `next` is not installed.

These checks do not certify a production build or live backend security. Restore project dependencies, run the complete checks, then perform integration/security testing against the configured Apps Script service before deployment.


## Phase 8 — Smart attendance status

Implemented attendance UI improvements include a dedicated Admin attendance workspace with date/range/class/section/status/search filters, server-response-only summary values, correction reason and expected-version fields, audit history lookup, and CSV export of actual records only. PDF export is not implemented. Teacher attendance supports explicit statuses, date validation, batch operation IDs, online/offline indication, and a volatile in-memory pending queue with batch-status check before retry. Student attendance remains read-only and derives summaries from returned records; unmarked records are not counted as absences.

**No attendance API operation is currently connected.** The Admin, Teacher and Student same-origin API handlers return `503 NOT_CONFIGURED` until secure session verification, role enforcement, assignment checks and a trusted server-to-server Apps Script connection are implemented. Therefore no live attendance reads, writes, corrections, audit history, reports or QR scanning are claimed to work.

Before deployment, inspect the actual workbook, reuse existing student/class/attendance tabs where possible, then implement the `AttendanceRecords`, `AttendanceOperations`, and `AttendanceAudit` contracts documented in `API-CONTRACT.md` only if no equivalent schema exists. Configure `Asia/Karachi` (or the school-approved timezone), use `LockService`, logical duplicate keys, idempotency records, optimistic record versions, per-entry batch outcomes and correction audit writes. Configure the secure Phase 7 opaque-card-token validation API before enabling QR attendance.

**Offline limitation:** pending batches live only in page memory and are lost on refresh, tab close, route unmount or browser restart. They are clearly labelled as not synced. This is not durable offline support. Do not use it as a substitute for a tested IndexedDB/service-worker design with session scoping and logout cleanup.

## Phase 9 — Homework & Assignment Management

- Teacher `/teacher/homework`: assignment form for assigned class/subject options returned by the backend, date validation, draft/publish choice, publish confirmation, preview, and search over assignment records returned by the service. A save/publish is reported as successful only if the API acknowledges it.
- Student `/student/homework`: published assignments only, search, due-state filtering, assignment details and explicit messaging that submission is unavailable until a secure workflow is connected.
- Admin `/admin/homework`: backend-derived published/draft/archived/overdue summaries, search, class/status/date filters and assignment list. No invented counts are shown.
- Shared validation is in `src/lib/homework/contracts.ts`. It validates real calendar dates, due-date ordering and computes upcoming/due-soon/overdue labels without inventing missing due dates.
- Full API endpoint requirements and proposed Sheets schema are in `API-CONTRACT.md` under Phase 9.

### Phase 9 integration status

No Apps Script homework operation is connected: the existing protected API handlers still fail closed with `503 NOT_CONFIGURED`. Therefore assignment creation/publishing, student submissions, uploads, secure attachment access, feedback and grading are not operational. The UI never fabricates a successful save or submission. The Student portal filters to records explicitly marked published and only displays data returned by its session-bound API; the server must still enforce student/class scope. Teacher class/subject choices must come from authenticated assigned records, not client-supplied permissions.

Before enabling files, configure a server-enforced size limit and MIME/signature allowlist, private Google Drive storage, ownership checks and authorized short-lived download/streaming. Never use arbitrary attachment URLs or public Drive permissions. Confirm the existing workbook before adding `Assignments`, `AssignmentAttachments`, optional `AssignmentSubmissions`, `SubmissionAttachments`, `SubmissionReviews`, and `AssignmentAudit` tabs. Use stable foreign keys, idempotency keys, Apps Script locking, optimistic versions and audit records for mutations.

## Phase 10 — Examinations and results

Added `/admin/examinations` for draft exam setup, `/admin/results` for review/approval/publication controls, teacher marks batch entry and marks status views, and a student published-results view with print styling. The shared `src/lib/examinations/contracts.ts` validates calendar dates and marks, distinguishes blank marks from zero, calculates totals only for complete valid subject sets, and strictly filters student results to records explicitly marked both `status: "published"` and `published: true`.

**Backend status:** Exam creation, marks submission, approval and publication are not connected to a live Apps Script service. Existing protected APIs still return `503 NOT_CONFIGURED`; the UI reports success only on an acknowledged response. No real PDF generation, grading policy, pass/fail thresholds, or promotion logic is implemented. Student print uses the browser print dialog, not a generated PDF. Do not deploy result publication until server-side session/role checks, assignment authorization, optimistic concurrency, idempotency, audit writes, complete-result validation and atomic publication are implemented.

**Policy/setup required:** Official academic years, exam dates, subjects, maximum marks, optional passing marks, weights/practicals, rounding policy (current helper uses two decimal percentage rounding), grade bands, pass/fail and promotion rules must be approved by the school. Inspect the existing Sheets workbook before creating proposed `Examinations`, `ExamSubjects`, `ExamMarks`, `ResultSets` and `ExamAudit` tabs. Never expose public Drive links or spreadsheet credentials.

## Phase 11 — Academic years, classes, subjects and timetables

### Routes added/expanded

- Admin: `/admin/classes`, `/admin/timetable`, `/admin/academic-years`.
- Teacher: `/teacher/classes`, `/teacher/timetable`.
- Student: `/student/timetable`.

### Timetable rules

The UI supports draft period entry, day-by-day preview, optional room/location, lesson/break/non-teaching kinds, edit/version fields, and publish/archive requests. It checks valid 24-hour times, end-after-start, class/section overlaps, teacher overlaps, and whether the chosen teacher/subject pair appears in the assignment records returned by the school service. Publishing must repeat these checks on the trusted backend under a lock and reject stale versions. The UI does not define official school hours, period length, teaching days or break times; those values must be returned by configured school settings.

### Academic-year workflow

Administrators can request year creation, explicit active-year switching and archival. Client-side validation rejects invalid ranges, duplicate names and date overlap with non-archived years. Archival is not deletion, and historical attendance, homework, examinations/results and ID-card references must remain available. Switching years must create an audit event and must not automatically promote students or reset school records. Year-end transition is review-only until the school approves progression, repeat, leaving and exception policies; no automatic promotion is implemented.

### Classes, sections and subjects

The UI consumes class, section, student enrollment, subject, teacher and assignment records from the backend. Section names are validated and duplicate class/year/section combinations are blocked client-side; sections with linked records must be archived rather than deleted. Subjects can be associated with selected classes, edited, activated/deactivated and assigned to a teacher when the backend supports those operations. The school must confirm the official curriculum, teacher qualification/authorization policy and actual enrollment record model. Counts are shown only when the backend returns numeric values from real records.

### Backend and configuration requirements

See `API-CONTRACT.md`, “Phase 11 — Timetable, class/subject assignment and academic years”, for proposed operations, logical tables, security checks, concurrency/version contracts and audit requirements. The current repository contains no inspectable Apps Script source, configured workbook, or trusted server-to-server Apps Script channel. Admin, Teacher and Student APIs still return `503 NOT_CONFIGURED`; saves, year activation, timetable publication, archival and promotion review are therefore not live. No fake records are used. Configure and review school-specific year dates, year-overlap policy, teaching days, hours, period length, breaks, subjects per class, teacher assignments, room/location rules, and promotion policy before enabling the backend.


## Phase 12 — School notices and communication

### Routes and lifecycle

- `/admin/notices`: create/update drafts, preview content, choose audience, set optional expiry, request publication/withdrawal/archival with confirmation and reasons, filter records and inspect returned publication history. Scheduled publication is exposed only if the backend advertises that capability.
- `/teacher/notices`: read-only published notices returned for the authenticated teacher. Teacher-created announcements are not enabled by default.
- `/student/notices`: published student-wide and authorized class/section notices, with a secondary client filter using class/section values returned in the session-bound profile. Server-side filtering remains mandatory.
- `/notices`: public notice list with search/category filtering and detail expansion; only public-audience notices explicitly published and currently unexpired qualify.

The shared validation and display rules live in `src/lib/notices/contracts.ts`; public and portal presentation uses `src/components/notices/notice-feed.tsx`. The Admin workspace is `src/components/admin/notice-management.tsx`. English, Urdu and Sindhi notice-management/feed labels are included, with RTL layout for Urdu and Sindhi. Official notice content is not machine-translated. Public-content entry includes an additional confirmation and basic client-side privacy checks; these are not substitutes for backend approval and validation.

### Backend and attachments

No notice operation is connected to a live Apps Script backend. Protected Admin/Teacher/Student handlers still return `503 NOT_CONFIGURED`, and the public notices endpoint also fails closed. No draft, publish, withdrawal, schedule, audit or attachment operation is claimed to be saved. Attachment upload/download is not operational; the UI accepts only an attachment reference and does not accept arbitrary URLs, and it clearly reports that secure file access is not configured. Do not store private Drive files in public folders.

Inspect the current workbook first, then implement the proposed `Notices`, `NoticeAudit`, and optional `NoticeNotificationOutbox` contracts in `API-CONTRACT.md` only if equivalent tabs do not exist. Configure session verification, server-side role/audience/class checks, optimistic versions, `LockService`, idempotency keys, audit logging and quota-safe batch operations before publishing real notices. Email and WhatsApp are not configured; the in-app feed is the only prepared notification channel.

## Phase 13 — Online admissions and application management

### Routes and current behavior

- `/admissions`: public admission information, school-policy placeholders, and multilingual online application form.
- `/admissions/apply`: standalone application form.
- `/admin/admissions`: authorized-service-backed review interface with search, status/class/date filters, application details, restricted-note placeholder, decision confirmations, and cursor-based pagination contract.
- `/api/admissions`: server-side input validation endpoint. It currently returns `503 NOT_CONFIGURED` after validation because durable backend storage and duplicate protection are not connected. It never reports a successful submission or issues a reference without backend confirmation.
- `/admissions/status` is intentionally not present until a secure independent verification mechanism is implemented.

### Collected fields

The form collects applicant name, date of birth, requested class (1–8), guardian name and Pakistan mobile number, address, optional previous school, optional existing GR/Seat Number, optional requested academic year, and explicit consent. A GR/Seat Number is not required for a new applicant. No documents are uploaded. School-specific deadlines, fees, eligibility rules, official contacts and required documents remain unpublished until verified by the school.

### Production prerequisites and limitations

No applications are currently stored in Google Sheets; no public application reference is issued; admin list/decisions do not work until the trusted API is connected; approval does not create a student record; no file uploads, CSV export, SMS/email verification or notification delivery is enabled. The admin interface sends expected-version and idempotency fields, but these are not effective until the trusted backend enforces them. Never deploy as a live intake workflow until a server-verified session, Apps Script transport, actual workbook schema, duplicate policy, backend reference generation, audit log, and safe conversion operation are implemented.

Before launch, the school must approve: admission opening/deadline, classes available, eligibility/age policy if any, required documents, fees if any, academic year, authorized reviewers, additional-information process, waitlist policy, official contact details, GR/Seat Number allocation, student conversion fields, retention/deletion policy and applicant privacy notice. The Google Drive upload control remains disabled; never use public Drive links.

## Phase 14 — School reports, analytics and performance dashboard

### Routes and data behavior

- `/admin/reports` provides filters for report category, date range, academic-year ID, class ID and section ID. It can display API-returned metrics, accessible bar breakdowns and tables, reports the source/period/refresh timestamp, and supports CSV export from validated returned report data plus browser Print / Save as PDF. It has loading, unavailable, error and partial-data states and does not display demo numbers.
- `/admin` links to the central reports workspace and keeps the existing verified-backend-only summary. No new numbers are fabricated.
- `/teacher/reports` is intentionally not implemented: the actual trusted role and class-assignment model has not been verified, and exposing school-wide reports through a client filter would be unsafe.

### Backend status and formulas

The reporting page requests `GET /api/admin/reports/summary`, but the existing protected Admin route still fails closed with `503 NOT_CONFIGURED`. Consequently reports are **not yet backed by live Google Sheets data**, and no CSV can be exported until an authorized, validated response is available. No Apps Script source or live workbook schema was available to inspect. See `API-CONTRACT.md`, “Phase 14 — School reports, analytics and performance dashboard”, for the proposed API and backend security requirements.

Attendance rate uses `(present + late) / configured countable statuses`; whether excused statuses belong in the denominator must be explicitly configured by the school. Unmarked sessions are excluded and shown separately, and a zero denominator returns no percentage. Enrollment counts distinct active student record IDs and does not count a linked admission twice. Missing exam marks remain missing, not zero. Published-result visibility, grading criteria, and historical coverage must come from verified school configuration and source data.

CSV values are protected against spreadsheet formula injection. Browser print styling is provided; dedicated PDF generation and Drive report-file storage are not implemented. Sensitive report access and export audit events must be enforced by the trusted backend. See `API-CONTRACT.md` for required sheet-schema inspection, batched aggregation, permissions, quotas and audit controls.

## Phase 15 — Automated backup and recovery

- Admin route: `/admin/backups`.
- The page displays only backup metadata returned by the trusted API, including status, verification, scope, counts/size where available, schedule and retention details. It has explicit unavailable/error states and a guarded restore UI.
- `src/lib/backups/contracts.ts` validates metadata, finds the latest verified backup, checks schema compatibility and computes retention candidates without deleting the latest verified snapshot or restore-locked backups.
- `GET/POST /api/admin/backups` deliberately return `503 NOT_CONFIGURED` until secure server-side Admin session verification, the trusted Apps Script transport, the actual workbook schema and a restricted Drive backup folder are implemented. Manual backup, scheduled triggers, retention cleanup, dry-run and restore are not live; no backup or restore has been reported successful.
- Scope must be confirmed after inspecting the live workbook. Passwords, secrets and session credentials are excluded. Separately stored Drive documents are not covered by a Sheets-only snapshot and require a separately approved strategy.
- Before launch, configure restricted Drive access, schema/version and checksums, resumable jobs if required by execution limits, time-driven trigger authorization, retention policy, audit events, pre-restore backup and isolated recovery testing. See `API-CONTRACT.md`, Phase 15.

## Phase 16 — Security audit and production readiness

- Added `docs/SECURITY_AUDIT.md` with evidence-based findings, endpoint inventory, severity, remediation status and verification limits.
- Added `docs/PRODUCTION_READINESS.md` with environment variable names, Google Apps Script and Google account checks, test/production separation, backup/restore gates and launch checklist.
- Hardened API JSON body parsing with a streaming 16 KiB limit, JSON content-type checks and malformed-body rejection. Login and recovery reject unexpected fields such as browser-supplied roles.
- Added baseline site-wide security headers in `next.config.ts`; HSTS and `upgrade-insecure-requests` apply only in production. CSP currently allows inline scripts/styles for compatibility and needs deployed browser validation.
- Hardened CSV formula-injection neutralization for formulas preceded by whitespace/control characters and added security tests.
- Test result: 129/129 tests pass. Lint, full typecheck, production build and dependency audit remain blocked in the present environment by absent `node_modules` and the absence of a committed package-manager lockfile.

**Readiness decision:** not production-ready. This repository contains no inspectable Apps Script source, live workbook schema, restricted Drive configuration or working session verifier. Authentication and protected data operations deliberately remain unavailable (`503 NOT_CONFIGURED`). No production Google/Vercel configuration or records were changed.
