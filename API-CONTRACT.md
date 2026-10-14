# Phase 3 — Authentication and registration API contract

## Status and trust boundary

This is a contract for a future Google Apps Script web app, not a deployed backend. The current site does not authenticate users, create sessions, send recovery email, or save registration requests. The existing generic Apps Script transport is a browser-side JSON request helper and is **not** a secure session boundary. Do not configure it for password-bearing requests until the deployment architecture below has been reviewed and implemented. A public Apps Script `/exec` URL is not a secret and does not make authorization trustworthy.

For production, prefer a same-origin Next.js server-side BFF that holds only server-side configuration, issues `Secure; HttpOnly; SameSite=Lax` cookies, and validates the session on every protected request. The BFF must communicate with a restricted Apps Script backend over a reviewed server-to-server authentication scheme. Apps Script web apps do not natively set cookies for the Vercel origin; direct browser-to-GAS login cannot satisfy the cookie/session requirements. If a server-side trusted channel cannot be implemented, do not enable password login or protected data routes. Never put a shared backend key in client bundles or `NEXT_PUBLIC_*` variables.

## Envelope

Success: `{ "ok": true, "data": {}, "requestId": "opaque-correlation-id" }`
Failure: `{ "ok": false, "error": { "code": "INVALID_INPUT", "message": "Request could not be completed.", "fieldErrors": {} }, "requestId": "opaque-correlation-id" }`

Do not include spreadsheet rows, stack traces, account-existence details, password hashes, session tokens, reset tokens, or other students' information in responses. Apply same-origin/CSRF protections to cookie-authenticated mutations and use generic recovery responses.

## Operations

- `POST /v1/registration-requests`: unauthenticated, rate-limited intake. Accept only `studentName`, optional `grNumber`, `classLevel`, optional `section`, `guardianName`, `guardianContact`, optional `guardianEmail`. Normalize and validate server-side. Duplicate matching must use normalized values plus a private keyed fingerprint / controlled review; do not reveal whether an existing GR number or student exists. Return a random, high-entropy receipt reference only after durable write; store a hash of any status lookup secret, not a public sequential sheet row. Default status is `pending`.
- `POST /v1/registration-status`: require the opaque reference plus an independently generated high-entropy secret; store only a hash of the secret, expire it, rate-limit, and return only that request's status. Never allow GR number alone to retrieve status.
- `POST /v1/auth/login`: accept school-issued identifier and password only through the approved BFF; verify a modern salted password hash (Argon2id preferred, or a vetted supported alternative) and active account state; return no token in JSON. Set a short-lived `HttpOnly; Secure; SameSite` cookie at the BFF, rotate session identifiers, rate-limit, and return generic failures. Apps Script/Sheets are not a password-hashing or session-cookie service by themselves; choose and validate a viable secure hash/session implementation before provisioning passwords.
- `POST /v1/auth/session`: validate the cookie-backed server-side session, expiry, revocation, account status and role. Never trust a role supplied by the client.
- `POST /v1/auth/logout`: revoke the server-side session and expire cookie.
- `POST /v1/auth/recovery-requests`: always return a generic accepted message where operational; rate-limit and deliver a one-time, high-entropy, short-lived token through a verified delivery provider. Store only token hash, expire and consume atomically, and never log token or send the old password.
- `POST /v1/auth/recovery-completions`: validate and consume token once, enforce password policy, update the password hash and revoke all sessions.
- `POST /v1/admin/registration-requests/:id/decision`: require a live `admin` session checked server-side, CSRF protections, an `approved|rejected` decision, reason policy, and audit event. Approval must verify the official record and link the request to its stable internal student ID; do not create a duplicate student record.

All protected operations require server-side authorization on every call: `admin`, `teacher`, `student`; deny pending, suspended, revoked, expired, or mismatched roles. A hidden button or protected-looking route is not authorization. Use lock-protected/idempotent operations for duplicate detection and status transitions, and never treat frontend validation as sufficient.

## Private Google Sheets tabs (restricted to authorized school operators)

- `RegistrationRequests`: `requestId`, `createdAt`, `updatedAt`, `studentName`, `normalizedNameKey`, optional `grNumber`, `classLevel`, `section`, `guardianName`, `guardianContact`, `guardianEmail`, `status`, `receiptSecretHash`, `linkedStudentId`, `reviewedByUserId`, `reviewedAt`, `decisionReasonCode`. Keep guardian data only as long as the school-approved retention schedule requires.
- `UserAccounts`: `userId`, `loginIdentifierNormalized`, `passwordHash` (only after approved hash design), `role`, `status`, `studentId` or staff reference, `createdAt`, `updatedAt`, `passwordChangedAt`, `failedLoginWindow`/lockout metadata. Never store plaintext passwords or recovery secrets.
- `Sessions` (only if the selected architecture can safely implement it): `sessionIdHash`, `userId`, `createdAt`, `expiresAt`, `revokedAt`, `lastRotatedAt`, minimal device/risk metadata. Never store bearer session tokens in the sheet.
- `RecoveryTokens`: `tokenHash`, `userId`, `createdAt`, `expiresAt`, `consumedAt`; no raw tokens.
- `SecurityAudit`: `eventId`, `timestamp`, `actorUserId`, `action`, `targetType`, `targetId`, `outcome`, `requestId`, minimal safe metadata. Never log passwords, tokens, full request bodies, or unnecessary guardian details.

Sheets have weak concurrency and transaction semantics. Use `LockService` and idempotency keys for atomic duplicate checks/status decisions, restrict spreadsheet and Apps Script project editors, limit deployment access, and test quotas and race conditions. Backups/retention must be approved by school policy. Do not publish a sheet or grant public access to it.

## Approval lifecycle

`pending -> approved | rejected`; decisions are made only by a live, authorized admin. Rejected requests cannot access the portal. Approval verifies identity through a school-approved process and links the request to the existing official student record. An assigned GR/Seat Number alone is not proof of identity. Pending students cannot sign in. Reopening or reversing a decision requires an audited admin operation.

## Required deployment decisions before enabling auth

1. Build and review the server-side BFF/session implementation and trusted BFF-to-Apps-Script channel.
2. Select a vetted password-hash implementation compatible with the runtime; Apps Script's basic digest utilities are not a substitute for a modern password-hashing scheme.
3. Configure verified recovery delivery, one-time token storage/consumption, and generic anti-enumeration responses.
4. Configure request throttling, abuse controls, CSRF/origin policy, monitoring, and operational incident response.
5. Restrict Apps Script, Sheets, Drive and Vercel project access; establish data retention and school-approved verification policy.
6. Test duplicate races, concurrent approvals, session revocation, role boundaries and Apps Script quotas before launch.


## Phase 4 — Admin dashboard operations (not implemented yet)

The dashboard calls same-origin `/api/admin/*`. That boundary currently returns `503 NOT_CONFIGURED` for every operation because there is no trusted session verifier or secured Apps Script server-to-server channel. Never replace it with direct public spreadsheet access.

Required operations, all requiring a live session checked on the server and role exactly `admin`:
- `GET /v1/admin/overview`: live counts and minimal recent notices/activity/tasks.
- `GET /v1/admin/students?q=&classLevel=&section=&status=&page=&pageSize=`; `POST /v1/admin/students`; `PATCH /v1/admin/students/:studentId`.
- `GET /v1/admin/teachers`; `POST /v1/admin/teachers`; `PATCH /v1/admin/teachers/:teacherId`.
- `GET /v1/admin/classes?academicYear=` plus class/section and teacher-assignment operations.
- `GET /v1/admin/registration-requests?status=pending&page=`; `POST /v1/admin/registration-requests/:requestId/decision` with decision, reason and verified existing student ID for approval.
- `GET /v1/admin/id-cards`, `/attendance`, `/homework`, `/results`; `GET|POST|PATCH /v1/admin/examinations`, `/notices`; `GET /v1/admin/admissions`; `POST /v1/admin/reports` (allowlisted reports only); `GET /v1/admin/audit-logs`; `GET|PATCH /v1/admin/settings`.
- `GET /v1/auth/session` verifies the session and role. Every mutation must enforce origin/CSRF policy, validate schema, use idempotency/locks for conflicts, and append audit events before success.

Use shared `{ok:true,data,requestId}` / `{ok:false,error,requestId}` envelopes. Student lists require bounded server-side filters/pagination and minimum necessary fields. Duplicate GR/Seat Number and staff IDs must be normalized and race-safe under `LockService`. Registration decisions verify the admin session, check official records, link an existing internal student ID, prevent double decisions and audit changes. CSV exports must neutralize formula-leading values (`=`, `+`, `-`, `@`, tab, CR). Rate limits, quota and conflict failures must not leak records.

## Phase 5 — Teacher Portal API contract (not implemented yet)

The UI calls same-origin `/api/teacher/*`. Every operation currently returns `503 NOT_CONFIGURED`; the portal does not claim to authenticate staff or read/write Sheets. The following are required before enabling any operation. Every request must validate the live server-side session, require role `teacher`, check active account state, and resolve the teacher's assignments from trusted backend records. Never trust `teacherId`, role, class, subject, student IDs, or permissions supplied by the browser.

- `GET /v1/teacher/dashboard`: only the authenticated teacher's class/subject assignments, today's configured timetable, today's attendance summary, pending work, upcoming assigned exams and published notices.
- `GET /v1/teacher/classes`: paginated assigned classes/sections and subjects. `GET /v1/teacher/classes/:classId/students?q=&page=&pageSize=` returns minimum student fields (stable internal ID, name, official GR/Seat Number) only after assignment verification.
- `GET /v1/teacher/attendance?classId=&date=` returns a roster and existing statuses only if the teacher is assigned. `POST /v1/teacher/attendance/batch` accepts `{classId,date,entries:[{studentId,status}],idempotencyKey,expectedVersion?}`. Validate date, class assignment, student membership, allowed school statuses, unique student IDs and bounded batch size. Use `LockService`, uniqueness by class/student/date, an idempotency key and conflict checks. Do not infer absent from a missing entry. Record actor, timestamp, before/after status and correction reason in audit history. Never overwrite another teacher's entries without an explicit authorized correction workflow.
- `GET /v1/teacher/homework`: assigned class/subject records only. `POST /v1/teacher/homework`, `PATCH /v1/teacher/homework/:id`, and `POST /v1/teacher/homework/:id/archive` enforce both class and subject assignment server-side, validate required fields and dates, and audit changes. Attachments require an approved MIME/size allowlist and private Drive authorization; never publish private Drive files.
- `GET /v1/teacher/examinations`: only assigned examinations. `GET /v1/teacher/examinations/:examId/marks?classId=&subjectId=` verifies exam/class/subject assignments and returns eligible students and the configured maximum marks. `PUT /v1/teacher/examinations/:examId/marks/draft` validates each mark in `[0,maxMarks]`, rejects duplicate or ineligible students, and uses version/conflict checks. `POST /v1/teacher/examinations/:examId/marks/submit` requires explicit confirmation and an idempotency key; final submissions are immutable unless an admin-approved audited reopening operation exists. Teachers cannot change exam rules or publish results.
- `GET /v1/teacher/results`: only the authenticated teacher's permitted class/subject results and submission statuses; do not publish incomplete/unverified results.
- `GET /v1/teacher/notices`: published school notices plus authorized teacher-targeted notices. Teacher publishing is denied unless a separate explicit permission exists.
- `GET /v1/teacher/profile`: only the session's own profile. `PATCH /v1/teacher/profile` allowlists non-sensitive fields; staff identifiers, role and account status require an Admin approval workflow.

All endpoints use the standard `{ok:true,data,requestId}` / `{ok:false,error,requestId}` envelope, no-store responses, same-origin/CSRF checks for cookie-authenticated mutations, request size and array bounds, generic authorization failures, quota/conflict/network-safe error codes, and minimal audit metadata. Never return a spreadsheet dump. Session expiry must return `401 SESSION_EXPIRED`; unauthorized role or assignment must return a generic `403 FORBIDDEN`. Apps Script quotas and concurrent attendance/marks writes must be tested before production.

## Phase 6 — Student Portal API contract

The Student Portal routes are `/student`, `/student/profile`, `/student/attendance`, `/student/id-card`, `/student/homework`, `/student/timetable`, `/student/results`, `/student/notices`, and `/student/settings`. The frontend uses same-origin `GET /api/student/:operation` calls with `credentials: same-origin` and `cache: no-store`; it never sends a student ID as an identity selector and never stores sensitive records or tokens in browser storage.

**These endpoints are currently unavailable.** `src/app/api/student/[...operation]/route.ts` returns `503 NOT_CONFIGURED` for all methods until a secure backend is implemented. No live student data is connected. Implement the following Apps Script operations behind a server-side Vercel BFF, and never let the browser call Apps Script with credentials:

- `GET /v1/student/dashboard`: derive the student from the validated session; return only that student's profile summary, valid attendance summary, assigned homework, configured timetable, published results and published notices.
- `GET /v1/student/profile`: return an allowlisted profile for the session student only. Guardian details require an explicit school policy allowing student access. Official identifier, class placement, enrollment status and role remain read-only.
- `GET /v1/student/attendance`: return only date/status records for the session student and support bounded date/academic-year filters. Missing records must remain unmarked, not absent. The UI summary counts only valid supported statuses.
- `GET /v1/student/id-card`: return only school-approved ID-card fields and a verified record state. Student photo links must be authorized, access-controlled and same-origin or otherwise securely proxied. Do not return a QR containing student details or a guessable identifier. Add a QR only after an opaque, high-entropy token issuance and verification endpoint exists; scans must not disclose private records without authentication.
- `GET /v1/student/homework`: return assignments for the student's session-derived current class/section and only authorized attachments. Submission status appears only if a real submission workflow exists.
- `GET /v1/student/timetable`: return the configured schedule for the student's current class/section; return an empty array if not configured.
- `GET /v1/student/results`: return only results whose server-side publication state is explicitly published. Draft/unpublished marks must never be returned.
- `GET /v1/student/notices`: return published notices appropriate for students, not private staff/admin messages.
- `GET /v1/student/settings`: return only safe settings supported by the current account architecture; never return password hashes, session tokens, recovery tokens or secret values.

Every endpoint must validate an unexpired, unrevoked server-side session; derive student identity from that session; reject caller-supplied identity overrides; apply no-store headers; validate bounded query parameters; return a standard `{ok:true,data,requestId}` / `{ok:false,error,requestId}` envelope; and use generic authorization errors. Expired sessions return `401 SESSION_EXPIRED`, unauthorized operations return `403 FORBIDDEN`, and temporary Apps Script quota/network failures must be explicit and never represented as successful saves. Use minimal field allowlists, restricted Sheets/Drive permissions, audit sensitive access as appropriate, and do not expose spreadsheet dumps or credentials.

The Student Portal currently provides UI layouts, honest unavailable states, a read-only attendance summary helper, published-result filtering, a month filter over loaded attendance records, and a print action for a fully approved/verified ID-card response. It does not have working authentication, student data reads, PDF generation, assignment submission, account changes or QR verification. No student-specific records are cached in local storage or session storage.

## Phase 7 — Digital Student ID Cards and QR Verification

**Status: frontend workflows and contracts are present; card operations are unavailable.** The current `GET|POST|PUT|PATCH|DELETE /api/admin/*` and `GET|POST|PUT|PATCH|DELETE /api/student/*` handlers remain fail-closed with `503 NOT_CONFIGURED`. No public QR verification route is exposed because there is no real token validator yet. Do not remove that restriction until the trusted backend is operational.

### Google Sheets model (minimum)

- `StudentIdCards`: `cardId` (random internal ID), `studentRecordId` (reference to the official Students record), `academicYear`, `status` (`active|replaced|revoked`), `tokenHash` (hash of a cryptographically random token; never store token plaintext), `createdAt`, `createdBy`, `replacedAt`, `replacedBy`, `revokedAt`, `revokedBy`, `revocationReason`, `version`.
- `IdCardAudit`: `eventId`, `cardId`, `studentRecordId`, `action`, `actorUserId`, `timestamp`, `reason`, `requestId`, `beforeStatus`, `afterStatus`. Avoid copying profile data into the audit table.
- Reuse `Students` as the source of truth for student name, GR/Seat Number, class, section, enrollment status and approved academic-year details. Never duplicate those personal fields in `StudentIdCards`.
- Official school name, approved logo, contact details and card policy must come from administrator-approved `SchoolSettings`; use labelled placeholders until then.

### Required trusted operations (not implemented)

All operations require a valid non-expired server-side session, exact role authorization, CSRF/origin checks for mutations, schema validation, bounded page sizes, rate limits, `LockService` or equivalent concurrency protection, idempotency keys, and audit logging. All responses use the standard API envelope and `Cache-Control: no-store`.

- `GET /v1/admin/id-cards/students?q=&classLevel=&section=&academicYear=&page=&pageSize=`: server-side search of verified, currently enrolled official students only; bounded pagination; minimum fields only.
- `GET /v1/admin/id-cards?status=&academicYear=&page=&pageSize=`: card records and minimum audit metadata, not a spreadsheet dump.
- `GET /v1/admin/id-cards/students/:studentRecordId/preview`: validates Admin session and eligibility; returns allowlisted card fields and authorized photo delivery mechanism.
- `POST /v1/admin/id-cards/issue`: `{studentRecordIds,academicYear,idempotencyKey}`; validate every record; atomically prevent duplicate active card per student/year unless approved policy permits it; create high-entropy QR token; persist only token hash; return plaintext token exactly once only if needed to render a QR.
- `POST /v1/admin/id-cards/:cardId/replace`: `{reason,idempotencyKey}`; within a lock create and persist replacement safely, rotate token, audit the transition, and only then deactivate the previous card in the same transaction-like critical section. On failure preserve a consistent single-active-card state.
- `POST /v1/admin/id-cards/:cardId/revoke`: `{reason,idempotencyKey}`; atomically revoke and invalidate token, requiring a reason and recording actor/time.
- `GET /v1/admin/id-cards/:cardId/audit`: authorized minimum audit events.
- `POST /v1/admin/students/:studentRecordId/photo`: multipart upload through the trusted server; allow JPEG/PNG/WebP only, enforce maximum 5 MiB, inspect file signature and fully decode/re-encode image, strip metadata, store in a private Drive folder, return no public Drive URL, audit replacements.
- `GET /v1/student/id-card`: identity derived exclusively from the validated student session; return only that student's current active card and approved fields.
- `GET /v1/public/id-card-verification/:opaqueToken`: only after a secure public verification service exists; hash/compare token securely, check active status and revocation on every request, rate-limit, and disclose only school-approved minimal verification (e.g. valid/invalid and optional student name/class only with explicit policy). Never return address, guardian data, attendance, results or the full student record.

Tokens must be generated using a cryptographically secure random generator on the trusted backend, contain at least 128 bits of entropy, and never be based on GR/Seat Number. Store a one-way hash or keyed digest and rotate on replacement/revocation. Never place private fields in QR content. No browser secret, Apps Script deployment secret, spreadsheet ID, or Drive credential may be shipped to the client.

### PDF and printing

The current feature provides a physical-dimension print-preview layout (85.6 × 54 mm) with clearly labelled placeholders. Browser printing may allow a user to choose “Save as PDF”, but this is **not** a verified generated-PDF export. Individual downloadable PDF and reliable batch PDF generation are not implemented. For 1,000 cards, implement bounded server-side or worker batches (e.g. 25–50 cards), per-item idempotency, resumable job state, partial-failure reporting and verified QR/image rendering before enabling bulk export. Do not run one unbounded browser operation.


## Phase 8 — Attendance Management contract (not yet connected)

The current `/api/admin/*`, `/api/teacher/*`, and `/api/student/*` handlers intentionally return `503 NOT_CONFIGURED`. The routes below are **required contracts, not working endpoints**. Do not remove the fail-closed behavior until the trusted Vercel server-side session verifier and server-to-server Apps Script channel are implemented and reviewed.

### Same-origin operations

- `GET /api/teacher/classes`: derive teacher identity from the validated session; return only assigned class/section/subject IDs.
- `GET /api/teacher/attendance/roster?classId=...&date=YYYY-MM-DD`: re-check teacher assignment, enrollment and permitted school-local date; return only minimum roster fields plus existing attendance and per-record version.
- `POST /api/teacher/attendance/batch`: body `{ operationId, classId, date, entries:[{studentId,status,expectedVersion?}] }`. `operationId` is a high-entropy client-generated idempotency key, not an authentication credential. Revalidate session, assignment, enrollment, every student ID/status/date, and record versions server-side. Return per-entry `saved|rejected|conflict` results only after durable writes; never imply partial success for rejected rows.
- `GET /api/teacher/attendance/batch-status?operationId=...`: status lookup scoped to the authenticated actor and stored operation.
- `GET /api/admin/attendance?...`: authorized, paginated summary/record query with date/class/section/status/search filters.
- `POST /api/admin/attendance/corrections`: admin-only correction requiring record ID, expected record version, supported status and a reason; audit the before/after values.
- `GET /api/admin/attendance/audit?...`: admin-only, paginated correction audit history.
- `GET /api/student/attendance`: derive the student ID exclusively from the validated student session; return only that student's records.
- QR attendance requires a future authenticated `POST /api/teacher/attendance/validate-card-token` that validates an opaque, active Phase 7 card token, confirms class membership and returns minimum student identity. Phase 7 token issuance/verification is not connected, so scanning is unavailable.

### Restricted Sheets model

Inspect the deployed workbook first and reuse any existing official attendance sheet. If no compatible table exists, the proposed private `AttendanceRecords` headers are:

`recordId`, `studentRecordId`, `classId`, `sectionId`, `attendanceDate` (school-local `YYYY-MM-DD`), `status`, `createdAt` (UTC ISO timestamp), `updatedAt` (UTC ISO timestamp), `markedByUserId`, `operationId`, `recordVersion`, `correctionReason`.

Keep idempotency/partial result state in a restricted `AttendanceOperations` sheet keyed by `(actorUserId, operationId)`, with `requestHash`, `state`, per-entry result, timestamps and expiry/retention metadata. Keep corrections in `AttendanceAudit` with `eventId`, `recordId`, `actorUserId`, timestamp, old/new status, reason and request/operation ID. Do not duplicate names, guardian information or other profile fields into these sheets.

Apps Script must use `LockService` around idempotency checks, duplicate lookup and writes. Enforce a unique logical key `(studentRecordId, attendanceDate)` and verify class/section membership before write. Store UTC ISO timestamps while treating attendance dates as school-local calendar dates (school timezone must be explicitly configured, e.g. `Asia/Karachi`). Reject stale `recordVersion` updates as conflicts. Batch sizes must be chosen by integration testing under Apps Script execution/runtime limits; do not assume a batch of 1,000 writes will fit one execution. Persist operation progress and return per-row results to support safe retries.

### Offline and QR limitations

The teacher UI has an **in-memory only** pending queue for network-loss recovery. It stores only student IDs, status, class/date and operation ID; it does not use localStorage/IndexedDB, survives neither reload nor browser close, and is not server persistence. The UI labels this state as unsynced. Before retrying a timed-out batch, query `batch-status` using the same operation ID; retry only with the same idempotency key. The current endpoint is unavailable, so retry cannot complete until backend work is deployed. No camera scanner is enabled because the secure ID-card token-validation API is absent.

### Security and operational requirements

- Every request revalidates session, role, assignment and enrollment on the backend; never trust role/user IDs in request JSON.
- Validate date format and allowed attendance period on the server; never infer `absent` from missing/unmarked entries.
- Limit query size/page size, payload size, batch count and request rate. Return request IDs and generic errors; do not return spreadsheet rows or stack traces.
- Correcting a record must require a reason and expected version, and append an audit event atomically with the update.
- Handle ambiguous network timeout by checking stored operation status; don't blindly create a new operation ID.
- Protect mutations with origin/CSRF checks if cookie sessions are enabled. Restrict Sheets and Apps Script editors, and never expose workbook IDs or server secrets to the browser.

## Phase 9 — Homework and assignments

The frontend currently uses the existing same-origin `/api/teacher/*`, `/api/student/*`, and `/api/admin/*` request clients. Those handlers still fail closed with `503 NOT_CONFIGURED`; no Google Apps Script assignment operation is connected. The following versioned operations define the required trusted backend contract:

- `GET /v1/teacher/assignments?classId=&subjectId=&from=&to=&status=` — return only assignments owned by the authenticated teacher for classes/subjects currently assigned to them.
- `POST /v1/teacher/assignments` — validate title (1–160 chars), instructions (up to 5,000 chars), assignment/due dates, enrollment, class/section/subject assignment and idempotency key; save as `draft` or `published` only after server authorization.
- `PATCH /v1/teacher/assignments/:assignmentId` — require owner or explicitly granted permission, `expectedVersion`, valid fields and an audit event.
- `POST /v1/teacher/assignments/:assignmentId/publish` and `/archive` — require current version, idempotency key, role checks and audit history.
- `GET /v1/student/assignments?from=&to=` and `GET /v1/student/assignments/:assignmentId` — derive student identity and class/section from the verified session; return published assignments for that class/section only.
- `GET /v1/admin/assignments?classId=&subjectId=&from=&to=&status=&q=` — return minimum required school-wide fields only after admin authorization.
- `POST /v1/teacher/assignments/:assignmentId/attachments` — accept multipart upload; backend allowlist MIME by inspecting file signatures, impose configured size limit, re-encode where appropriate, and store privately in Drive.
- `GET /v1/assignments/:assignmentId/attachments/:attachmentId` — verify assignment publication, class membership and user role before streaming or issuing a short-lived authorized download. Never return a public Drive URL.
- Optional submissions: `POST /v1/student/assignments/:assignmentId/submissions`, `GET /v1/student/assignments/:assignmentId/submission`, and `POST /v1/teacher/assignments/:assignmentId/submissions/:submissionId/review`. Derive identity from the session, verify class membership and teacher assignment, support idempotency and optimistic version checks, and audit review/feedback changes.

### Suggested Sheets model (confirm existing workbook before creating tabs)

- `Assignments`: `assignmentId`, `teacherRecordId`, `classId`, `sectionId`, `subjectId`, `title`, `instructions`, `assignedDate`, `dueAt` (school-local date/time with documented timezone), `status`, `version`, `createdAt`, `updatedAt`, `publishedAt`, `idempotencyKey`.
- `AssignmentAttachments`: `attachmentId`, `assignmentId`, `driveFileId` (private), `originalName`, `verifiedMimeType`, `sizeBytes`, `createdBy`, `createdAt`, `status`.
- Optional `AssignmentSubmissions`: `submissionId`, `assignmentId`, `studentRecordId`, `textAnswer`, `status`, `submittedAt`, `version`, `idempotencyKey`.
- Optional `SubmissionAttachments`: `submissionAttachmentId`, `submissionId`, `driveFileId` (private), `verifiedMimeType`, `sizeBytes`, `createdAt`.
- Optional `SubmissionReviews`: `reviewId`, `submissionId`, `reviewerTeacherId`, `status`, `feedback`, `reviewedAt`, `expectedVersion`.
- `AssignmentAudit`: `eventId`, `assignmentId`, `submissionId` (optional), `actorId`, `action`, `timestamp`, `reason`, `requestId`, `beforeVersion`, `afterVersion`.

Use existing official student, teacher, class and subject IDs rather than copying personal information. Apps Script must use `LockService` for idempotency/critical writes, bounded batch operations, optimistic version checks and explicit partial-failure results. Private Drive permissions must not be relaxed for convenience. The frontend does not directly access the spreadsheet or Drive APIs.

### Current limits

Assignment create/publish controls submit through the existing teacher API boundary and show success only if the API acknowledges the write, but current API handlers return `503 NOT_CONFIGURED`. Student submissions, attachment uploads/downloads, teacher feedback, grading and admin mutations are not implemented as live workflows. No file upload size/type policy is active yet; set and enforce it server-side before enabling uploads. No real assignment data is bundled.

## Phase 10 — Examinations and results

The examination UI and calculation helpers are implemented, but protected API handlers remain fail-closed (`503 NOT_CONFIGURED`) until the secure session verifier and trusted Apps Script channel are deployed. No exam/marks records are live and no approval or publication is confirmed by this package alone.

Required API operations:
- `GET /v1/admin/examinations?academicYear=&classId=&status=`; `POST /v1/admin/examinations` with name, academicYear, classId, optional section, subjects, dates and idempotencyKey; `PATCH /v1/admin/examinations/:examId` with expectedVersion.
- `GET /v1/teacher/examinations` and `GET /v1/teacher/examinations/:examId/subjects/:subjectId/roster`, each scoped to authenticated teacher assignments.
- `POST /v1/teacher/examinations/:examId/subjects/:subjectId/marks/batch` with entries, expectedVersion, idempotencyKey and `action=draft|submit`; response must report saved/rejected/conflicted records.
- `GET /v1/admin/results`; `POST /v1/admin/results/:resultSetId/return|approve|publish|unpublish`, with role checks, expectedVersion, idempotencyKey and required reason for return/unpublish.
- `GET /v1/student/results` derives student identity from the verified session and returns only officially published records for that student.

Suggested Sheets tables (inspect existing workbook first): `Examinations` (examId, name, academicYear, classId, section, startDate, endDate, status, version, createdBy, timestamps), `ExamSubjects` (examSubjectId, examId, subjectId, maximumMarks, optional approved passingMarks, assignedTeacherId), `ExamMarks` (markId, examId, examSubjectId, studentRecordId, obtainedMarks, status, version, updatedBy, updatedAt, operationId), `ResultSets` (resultSetId, examId, classId, section, status, version, approvedBy/At, publishedBy/At), `ExamAudit` (eventId, entityId, action, actorUserId, reason, before/after summary, timestamp, requestId). Reuse official student/class/subject/staff IDs; do not duplicate personal records.

Results are complete only when every required subject has a valid numeric mark; zero is a valid mark and blank is missing. Percentage is calculated as total obtained / total maximum × 100, rounded to two decimal places. No grade, pass/fail, promotion, weighting, practical component or passing threshold is inferred. These require an approved, versioned school policy. Server must validate every mark, lock/co-ordinate concurrent batches, enforce idempotency and optimistic concurrency, write audit events, and verify completeness atomically before publication. Draft and unapproved records must never be returned to students.

## Phase 11 — Timetable, class/subject assignment and academic years

**Implementation status:** frontend workflows and pure validation contracts are present. The current repository does not contain Google Apps Script source, a trusted server-to-server Apps Script client, a configured workbook ID, or an inspectable live spreadsheet schema. The existing `/api/admin/*`, `/api/teacher/*`, and `/api/student/*` handlers remain fail-closed with `503 NOT_CONFIGURED`. The operations below are required contracts, not live integrations. Do not create sheets or claim records are saved until the actual workbook has been inspected and a school-authorized migration has been approved.

### Routes and role scope

- Admin: `GET /api/admin/classes`, `POST /api/admin/classes/sections`, `PATCH /api/admin/classes/sections/{sectionId}`, `POST /api/admin/classes/sections/{sectionId}/archive`, `GET/POST /api/admin/subjects`, `PATCH /api/admin/subjects/{subjectId}`, `POST /api/admin/subjects/{subjectId}/status`.
- Academic years: `GET/POST /api/admin/academic-years`, `POST /api/admin/academic-years/active`, `POST /api/admin/academic-years/{yearId}/archive`.
- Timetable: `GET/POST /api/admin/timetable`, `PATCH /api/admin/timetable/{entryId}`, `POST /api/admin/timetable/{entryId}/publish`, `POST /api/admin/timetable/{entryId}/archive`, `GET /api/admin/timetable/settings`, and `PATCH /api/admin/timetable/settings`.
- Teacher: `GET /api/teacher/classes`, `GET /api/teacher/timetable`. Teacher identity must come from the verified server-side session; no teacher ID in query/body is authoritative.
- Student: `GET /api/student/timetable`. Student identity, class, section and active enrollment/year must be resolved from the verified session and trusted student/enrollment records. Ignore or reject client-supplied identity/class overrides.
- Year transition: `GET /api/admin/year-transitions/review?academicYearId=...` returns a review-only roster with student reference, current class, proposed next class if policy permits, enrollment status and review status. A future `POST /api/admin/year-transitions/{operationId}/approve` must require an explicit authorized confirmation and school-approved progression policy; it is not enabled by this package.

Every mutation request should include a unique `operationId` idempotency key and `expectedVersion` for edits. Return the committed record and incremented version only after the backend write and audit event succeed. Return a conflict response (HTTP 409) when the supplied version is stale. Never respond with success after a failed Sheets write or audit append. All protected operations require live session verification, exact role checks, active account checks, CSRF/origin protection for cookie sessions, minimal field allowlists, no-store responses, request size limits, and server-side authorization of every referenced record.

### Existing records and proposed tables

Reuse and inspect the existing student, teacher, class, section, enrollment, subject, attendance, homework and examination records before mapping fields. The current repository contains no workbook schema or Apps Script source to prove those live tabs exist, so these are proposed logical tables only:

- `AcademicYears`: `academicYearId`, `name`, `startDate`, `endDate`, `status`, `version`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `activatedBy`, `activatedAt`, `archivedBy`, `archivedAt`.
- `ClassSections`: `sectionId`, `classId`, `academicYearId`, `name`, `status`, `version`, timestamps and actor references. Enforce uniqueness for normalized `(classId, academicYearId, name)` under `LockService`.
- `Subjects`: `subjectId`, `name`, `code`, `active`, `version`, timestamps and actor references.
- `ClassSubjectAssignments`: `assignmentId`, `classId`, `academicYearId`, `subjectId`, `teacherId`, qualification/authorization status, `version`, effective dates and actor references. The school must confirm what qualification/authorization evidence and curriculum mapping are required.
- `TimetableEntries`: `entryId`, `academicYearId`, `classId`, `sectionId`, `day`, `periodNumber`, `startTime`, `endTime`, `kind` (`lesson`, `break`, `non_teaching`), nullable `subjectId`, nullable `teacherId`, optional `room`, `status` (`draft`, `published`, `archived`), `version`, `operationId`, actor references and timestamps.
- `TimetableSettings`: configured teaching days, school opening/closing time, periods/period lengths, permitted time intervals and break definitions; never use hardcoded defaults as official school settings.
- `YearTransitionReviews`: `reviewId`, `academicYearId`, `studentRecordId`, current class/enrollment, proposed next class/status, reviewer, review status, policy reference and timestamps. A promotion transaction must store immutable before/after class/enrollment references and be idempotent per student and transition.
- `AcademicAudit`: `eventId`, entity type/id, action, actor user ID, timestamp, request ID/operation ID, reason and minimal before/after summary.

These proposed logical tables are not instructions to duplicate student or teacher profiles. Use existing stable record IDs and preserve references from historical attendance, homework, examinations/results and ID cards. Archival is a status transition; never cascade-delete historical records.

### Server-side validation and concurrency

- Validate date-only values strictly (`YYYY-MM-DD`), end date not before start date, normalized duplicate year names, and date overlap under the school's confirmed academic-year policy. The current client validation rejects overlaps with other non-archived years by default; the trusted backend must repeat the rule.
- Validate section names and uniqueness within class/year. Prevent physical deletion where enrollment or academic references exist; use controlled archival instead.
- A lesson requires an active class-subject-teacher assignment for the selected year. Break/non-teaching periods do not require subject/teacher references.
- Validate 24-hour times, `endTime > startTime`, period bounds, no overlapping intervals within a class/section, and no same-teacher interval overlap across classes. Re-run all checks inside the write critical section, not only before the UI request.
- Use `LockService` around duplicate checks, active-year switching, conflict checks, version comparisons, idempotency and mutations. Use batch `getValues()`/`setValues()` and bounded ranges; avoid one spreadsheet call per row. Handle Apps Script quotas/timeouts with explicit retriable errors and no false success.
- Publishing a timetable must validate the entire target schedule atomically, including configured school hours, periods, breaks, class/subject/teacher assignments and teacher conflicts. Teacher/student APIs return only published entries within the session-derived authorization scope.
- Active-year switching requires explicit confirmation, one active year under the chosen school policy, and an audit event recording actor and time. It must not promote students, clear attendance, change examination results, or rewrite prior-year records.
- Promotion remains review-only until official pass/advance/repeat/leaving rules, exceptional cases, approval roles, and audit/rollback policy are confirmed. Any future promotion approval must prevent duplicate student/year operations and preserve historical links.

### Current limitations

The UI calls the existing same-origin API clients and only shows a success message after an acknowledged response. With the current fail-closed handlers, no real class, section, subject, academic-year or timetable change can be persisted yet. Frontend checks are not an authorization boundary and do not replace server-side conflict detection, session verification, version checks, idempotency or audit logging. No live class counts, school hours, curriculum, timetable, or promotion policy is bundled.

Teacher records used by class-subject assignment selectors must include a backend-verified `eligibleForAssignment: true` (and active account state); the frontend intentionally omits teachers unless that flag is present. The backend must calculate this flag from the school's approved qualification/authorization policy and recheck it at mutation time.


## Phase 12 — Notices and communication

### Logical notice record

Inspect the actual school workbook and reuse equivalent existing tabs before adding anything. The proposed `Notices` row has `noticeId`, `title`, `body`, `category`, `audience`, `classIds`, `sectionIds`, `status`, `published`, `publicApproved`, `publishedAt`, `scheduledAt`, `expiresAt`, `creatorId`, `createdAt`, `updatedAt`, `updatedBy`, `attachmentId`, `version`, and `idempotencyKey`. Keep `NoticeAudit` as an append-only audit log and `NoticeNotificationOutbox` only if a delivery provider is approved and configured. IDs are stable references, not spreadsheet row numbers.

### Same-origin API operations required

- `GET /api/admin/notices`: return authorized notice records, per-notice version and publication history, plus capabilities (for example `scheduledPublishing`).
- `POST /api/admin/notices`: create a draft. Validate all fields and audience targets on the server; accept an idempotency key.
- `PUT /api/admin/notices/{noticeId}`: update draft only with `expectedVersion`; reject stale versions.
- `POST /api/admin/notices/{noticeId}/publish`: publish now only after re-validating audience, approval and content.
- `POST /api/admin/notices/{noticeId}/schedule`: schedule only when the backend advertises and implements this capability.
- `POST /api/admin/notices/{noticeId}/withdraw` and `/archive`: require reason, expected version, idempotency key and audit write.
- `GET /api/admin/notices/{noticeId}`: return details/history only to authorized Admins.
- `GET /api/teacher/notices`: derive teacher identity from the authenticated session and return only published school/teacher notices and class notices for authorized assignments. Teachers are read-only by default.
- `GET /api/student/notices`: derive student identity, class, section and academic year from the authenticated session and return only applicable published notices. Never accept browser-supplied identity as authority.
- `GET /api/notices`: public, cache-controlled endpoint returning only notices explicitly approved for the public audience, published now and not expired. The public response must not include class/student/admin records, private attachment references, internal audit data or spreadsheet metadata.
- Authorized attachment endpoints must stream or mint short-lived downloads only after audience/role checks. Never accept arbitrary attachment URLs. Upload validation must enforce byte size, MIME and file signature, and private Drive permissions.

### Security, publication and notifications

All operations require server-side session verification, role authorization, class/section lookup against trusted records, and trusted server-to-server Apps Script credentials stored only server-side. Public notices require an explicit public audience and `publicApproved: true`; audience and target IDs supplied by the browser are untrusted input. Validate title/body/category lengths, supported status transitions, valid expiry timestamps, public-content approval, and class/section ownership on the server. A publish operation must set authoritative `publishedAt`, `published: true`, and status atomically. Expired/withdrawn/archived records must not appear in feeds. Use `LockService`, optimistic versions, idempotency keys and append-only audit events for changes; batch reads/writes and bounded retries should handle quotas and transient errors without reporting a failed write as success.

In-app feeds are the only communication channel prepared in this phase. Email/WhatsApp delivery requires a school-approved provider, server-only credentials, recipient selection from authoritative audience records, an outbox with a unique `(noticeId, version, channel, recipient)` delivery key, retry/backoff and delivery audit. Editing an already published notice must not automatically resend a notification unless the approved policy explicitly requests it. No external delivery provider is configured.

### Current implementation status

The frontend has an Admin notice lifecycle UI, teacher/student feed filters, and a public notice list. The current Admin/Teacher/Student protected route handlers and the public `/api/notices` route deliberately return `503 NOT_CONFIGURED` because the project does not include a verified server-side session service, inspectable Apps Script source, or trusted backend channel. Therefore draft writes, publication, scheduling, audit history, class targeting, and attachment access are not live. The UI only reports a successful mutation when the protected API acknowledges it. The public page shows an explicit unavailable state rather than fabricated notices.

## Phase 13 — Online admissions and application management

**Implementation state:** UI and validation contracts are present. The API intentionally returns `503 NOT_CONFIGURED` after validating public submissions because no trusted Apps Script endpoint, workbook schema, secure session verifier, duplicate-check transaction, or audit writer is configured. No application is currently persisted, no public reference is issued, and no decision or student conversion is confirmed. Do not enable this workflow for real applicants until the backend steps below are implemented and tested.

### Proposed Sheets structures — only after inspecting the live workbook

Do not create or rename tabs until the actual school workbook and existing student/class/section/academic-year/user/audit schemas have been inspected. If no equivalent tables exist, agree these columns with the school first:

- `Admissions`: `applicationId` (opaque internal ID), `reference` (cryptographically random public reference), applicant/guardian fields, requested class, academic year, normalized guardian phone, status, submitted/updated timestamps, version, restricted review note, reviewer user ID, reviewed timestamp, document references, linked student ID, duplicate-check key, retention/deletion state.
- `AdmissionAudit`: event ID, application ID, event type, prior/new status, authenticated actor ID, timestamp, reason, operation key, version, and conversion/student ID where relevant. Do not log full addresses or guardian phone numbers unless essential.
- Use existing student, class, section, academic-year, user and audit structures; never create a parallel student schema. The app-level `AdmissionApplication` type is a proposed contract, not evidence of current spreadsheet columns.

### Required trusted backend operations

- `POST /admissions/submit`: validate all fields again, normalize phone, check duplicate policy under a lock, generate an unpredictable reference server-side, write application and audit event, and return the reference only after durable write confirmation.
- `GET /admin/admissions`: require server-verified Admin role; filter/search/paginate on the backend and return only fields necessary for the list.
- `GET /admin/admissions/{id}`: Admin-only details and restricted notes.
- `POST /admin/admissions/{id}/decision`: require authenticated reviewer identity from the session, validate state transition, expected version and idempotency key, append audit event, and return the committed version.
- `POST /admin/admissions/{id}/convert`: require approved state, existing applicant/student duplicate check, valid class/section/academic-year records and authorized GR/Seat Number allocation; atomically or safely idempotently create/link a student record and audit the conversion. If Apps Script/Sheets cannot provide a true multi-row transaction, use a lock, conversion operation ID, durable conversion state and recovery/reconciliation process.
- Public status lookup remains disabled. Enable only with an additional independent verification factor, rate limits, generic responses, abuse monitoring and no personal data in URLs.
- Additional-information requests must not expose restricted review notes to the applicant unless a verified private channel and dedicated public-safe message field are implemented.

### Security and reliability requirements

- Never trust browser-provided roles, reviewer IDs, student IDs, statuses, or reference generation. Derive actors and roles from a verified server-side session.
- Normalize phone numbers before duplicate checks. A duplicate policy must be approved by the school; shared family phone numbers alone must not automatically reject siblings.
- Use `LockService` or equivalent around duplicate checks, reference allocation and conversion; batch Sheets reads/writes; enforce payload/file limits; retry transient failures safely; handle quotas and timeouts without returning false success.
- Public references must be generated by the backend using a cryptographically secure random source and must not encode row numbers or student identifiers.
- Drive files, if later enabled, must be uploaded through an authorized backend, type/size checked server-side, stored privately, scanned where practical, and associated only after the backend validates ownership. Never publish Drive links or credentials.
- Establish school-approved admission policy, class capacity, age/eligibility policy if any, application dates, document checklist, fees (if any), reviewer permissions, GR allocation rules, retention/deletion schedule and applicant privacy notice before production use.

### Current routes

- `/admissions` and `/admissions/apply` render the multilingual application form and clearly explain that submissions are unavailable until storage is configured.
- `/api/admissions` validates the payload and fails closed with `503 NOT_CONFIGURED`; GET lookup is also disabled.
- `/admin/admissions` renders a paginated/filterable review interface, but list and decision requests fail closed through the existing admin API boundary until session verification and the school API are configured.
- `/admissions/status` is deliberately not implemented: no secure verification factor exists.
- File uploads, CSV export, SMS/email verification, email/WhatsApp notices, and automatic student creation are not implemented.

## Phase 14 — School reports, analytics and performance dashboard

### Current status

- `/admin/reports` uses `src/components/admin/reports-management.tsx` and requests `GET /api/admin/reports/summary` through the same-origin admin API client. It shows metrics, bar breakdowns and tables only when the response passes the report payload shape check. Loading, unavailable, error and partial-data states are explicit; missing values are not replaced with zero.
- `/admin` links to the reports dashboard and retains its existing backend-returned summary cards. No report numbers are hardcoded.
- Teacher reporting is not added: current protected APIs fail closed and the actual Apps Script role/class-assignment enforcement has not been inspected. Do not expose a teacher-wide report endpoint until the server-side assignment model is verified.
- `/api/admin/[...operation]` still returns `503 NOT_CONFIGURED`. There is no connected Apps Script source or verified workbook schema in this repository. Therefore no live report currently loads and CSV export remains unavailable in practice until the authorized API returns validated data.

### Proposed API

`GET /api/admin/reports/summary?category=overview|attendance|enrollment|admissions|examinations&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&academicYearId=...&classId=...&sectionId=...`

The Vercel route must authenticate the same-site session, resolve the staff identity and role server-side, validate date ranges and IDs, authorize each requested scope, and pass only validated filters to the trusted Apps Script channel. The browser must not send a reviewer ID or role. Apps Script should aggregate in batches, return a stable report contract (`generatedAt`, `refreshedAt`, `period`, `appliedFilters`, `source`, `metrics`, optional `series`, `tables`, `partialData`, and `warnings`) and never return raw sheet contents, secrets, or unnecessary student-level identifiers.

Suggested report categories and fields, conditional on verified existing sheet columns:

- Overview: active/inactive/archived student counts, active teachers, class/section enrollment, application status counts, attendance summary and published-result summary.
- Attendance: counts for each configured status, unmarked sessions separately, class/section breakdown, and the reporting denominator. Exclude unmarked sessions from the attendance-rate denominator; do not count absent rows that do not exist; deduplicate retried records using a stable record ID and honor the attendance correction/audit source of truth.
- Enrollment: distinct active student IDs grouped by class/section and academic year; linked admissions are not separate student enrollments. Historical trends must state the earliest reliable coverage date.
- Admissions: status counts and approved-but-unconverted counts only if the current application schema supports the linked student ID and conversion status.
- Examinations: published results only for public performance summaries; draft/review data only for explicitly authorized Admins. Missing marks remain missing. Pass/fail requires school-configured grading and pass criteria.

### Calculation definitions

- Attendance rate = `(present + late) / configured countable statuses`. Unmarked sessions are excluded and displayed separately. Whether excused statuses belong in the denominator must be explicitly configured by the school; no default is assumed. Return no percentage when the denominator is zero. The denominator and status policy must be returned/documented with the report.
- Enrollment = count of distinct active student record IDs after excluding inactive/archived records where the existing schema explicitly supports those states. Do not add an application already linked to a student.
- Marks average = mean of recorded numeric marks only; missing marks are separately counted and are never interpreted as zero. Comparisons require comparable exams, subjects and grading scales.

### CSV and print

CSV is generated client-side only from a validated, authorized report payload already returned by the API. Formula-leading cells (`=`, `+`, `-`, `@`, tab and carriage return) are prefixed safely and quotes are escaped. The print stylesheet supports browser Print / Save as PDF; no dedicated server PDF generation or Drive report-file storage is implemented. Sensitive report access and export initiation should be audited server-side once the trusted API is connected.

### Security, scale and missing schema

Use batched reads and server-side aggregation, bounded date ranges, and pagination for detailed reports; avoid one spreadsheet read per student. Apply no public/shared cache to confidential responses. Audit sensitive report access and exports without recording unnecessary personal information. Before implementing the backend, inspect and map existing Students, Teachers, Classes, Sections, AcademicYears, Attendance, Admissions, Exams/Results and Audit schemas. If a required field such as stable attendance record ID, active status, publication state, conversion link, or grading configuration is absent, document and resolve the schema gap instead of inferring it. No teacher report route or client-only authorization is a substitute for Apps Script authorization.

## Phase 15 — Automated backup and data recovery

### Current implementation status

`/admin/backups` provides a metadata-driven dashboard, backup history/detail views, status/verification display, schedule/retention visibility and a guarded restore confirmation flow. It never invents backup rows. `GET` and `POST /api/admin/backups` currently return `503 NOT_CONFIGURED`: this repository has no verified server-side Admin session verifier, trusted Apps Script transport, inspectable live workbook, or restricted Drive backup folder. Therefore manual backup, schedule installation, retention cleanup, restore and restore dry-run are **not live**. No Apps Script trigger is claimed installed, and no restore has been tested against an isolated spreadsheet.

### Required trusted Apps Script implementation

Before enabling the API, inspect the live workbook tabs, headers, formulas, data types and data ownership. Reuse existing student, teacher, class/section, academic-year, attendance, homework, examination/result, notice, admissions, audit and configuration structures. Explicitly exclude passwords, session tokens, secrets, OAuth material and unnecessary authentication records. Drive attachments and other non-Sheets files are out of scope unless a separate file backup process is approved and verified.

Suggested metadata structure only after workbook inspection: `BackupOperations` with opaque backup ID, operation ID, created/updated timestamps, actor identifier (`scheduler` for scheduled runs), status, schema version, scope keys, per-sheet expected/captured record counts, private Drive file reference, checksum, byte size if reliably available, verification result, safe error code/message, restore lock/state, retention outcome and audit correlation ID. Keep backup metadata access Admin-only; do not return raw Drive file IDs or private URLs to the browser unless strictly necessary.

Required operations (all server-authorized from a verified session or an explicit trigger execution context):
- `GET /admin/backups`: return bounded metadata/history, schedule/retention configuration and capabilities; never return sheet data or Drive download links.
- `POST /admin/backups` with a fixed action allowlist: create, configure schedule, configure retention, restore dry-run, restore. Validate every payload; reject unknown actions and arbitrary storage references.
- Snapshot creation: acquire `LockService` lock; create a unique operation and backup ID; read source ranges in batches; capture schema version, sheet names/keys and record counts; write a new private Drive file (never overwrite a verified backup); read the new file back; parse it; verify metadata, checksum, schema and expected/captured counts; only then mark it verified. On timeout, use a durable resumable state machine/chunk manifest and do not mark partial snapshots successful.
- Scheduling: install only the intended time-driven trigger, first removing duplicate triggers owned by this script; persist schedule config and last execution outcome. Trigger timing is approximate and must not be promised to the minute. Document account authorization and manually verify trigger execution/logs.
- Retention: run under lock; retain at least one latest verified backup and configured number of verified backups; exclude restore-locked backups; only clean old verified backups after a newer verified backup exists; audit every deletion and cleanup failure.
- Restore: require Admin session, server-side selected backup lookup, compatible schema and full integrity validation; dry-run first; create and verify a pre-restore snapshot; lock out conflicting jobs; stage/validate data before mutation; use operation IDs and a durable restore journal with reconciliation if Sheets cannot offer atomic multi-sheet transactions; verify affected sheets/counts after writes; append audit outcome. Do not delete post-backup records without explicit, audited policy and confirmation. Never restore an unverified file.

### Storage and security

Use a dedicated restricted Drive folder owned by the school's authorized account or shared drive, with least-privilege access and no public links. Store folder references and any service credentials only in server-side Apps Script properties with restricted editor access. A spreadsheet snapshot alone does not back up separate Drive documents. Apply no-store responses, rate limits, idempotency keys, server-side role checks, safe errors and audit events. Never accept caller-supplied actor, role, file ID, sheet ID, or destination path as authoritative.

### Recovery testing

Create an isolated test spreadsheet and test Drive folder with synthetic records. Create a backup, read it back and verify checksum/counts; perform a dry-run; restore only to the isolated spreadsheet; compare headers, record counts, representative data and checksum; test interruption/resume and failed writes; record test date and result. No destructive test on production school data without explicit authorization and a separately verified recovery plan.

### UI and known limitations

The dashboard supports status-driven display, safe error states, scope details and restore confirmation. Actions remain disabled unless the server advertises support; the current API returns `503 NOT_CONFIGURED`, so none of these operations is enabled. A typed confirmation and browser confirmation are defense-in-depth only; the backend must independently enforce all restore safeguards. The actual workbook schema, account permissions, retention values, timezone and approved backup scope remain unverified and must be decided by the school.

## Phase 16 — Security audit and launch gate

The source-level audit and production checklist are in `docs/SECURITY_AUDIT.md` and `docs/PRODUCTION_READINESS.md`. This is a source-only assessment: there is no Apps Script implementation or live workbook/Drive configuration in this repository snapshot, so no claims are made about deployed GAS authorization, Google sharing settings, or production data.

The current `src/lib/api/http.ts` enforces a streaming 16 KiB JSON body limit rather than trusting `Content-Length`; API responses include `Cache-Control: no-store, max-age=0`, `Pragma: no-cache`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`. `next.config.ts` configures baseline site-wide browser security headers; HSTS and `upgrade-insecure-requests` are production-only. The current CSP permits inline scripts/styles for compatibility and must be verified in a deployed browser before launch.

The CSV helper neutralizes formula-leading values after leading whitespace/control characters. This protects exports from common spreadsheet formula interpretation, but exported data remains untrusted and should be tested with the spreadsheet software used by the school.

No protected API should be enabled until server-side sessions, role/record-level authorization, trusted Vercel-to-Apps-Script transport, backend validation/idempotency/audit, private Drive access, test/prod separation and the security test matrix are implemented and verified. `503 NOT_CONFIGURED` responses are intentional and must not be changed to successful placeholders.
