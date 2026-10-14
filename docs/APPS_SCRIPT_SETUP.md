# Google Apps Script Backend — Setup and Implementation Plan

**Current state:** no Apps Script source was found in the supplied project snapshot. There is no `Code.gs`, `appsscript.json`, `*.gs` file, deployed URL or test deployment available to inspect. This document describes a proposed implementation, not a live or deployed backend.

## Architecture decision

Use the Next.js server routes as the browser-facing Backend-for-Frontend (BFF). The browser calls only same-origin `/api/...` routes. The Next.js server validates the browser session, applies role and record-level authorization, and calls a private-trust Apps Script web app using a server-only shared HMAC/request-signing secret. Do not call privileged Apps Script endpoints directly from browser code. `src/lib/api/client.ts` has a direct URL helper but no call sites were found; do not use it for privileged requests.

A shared secret in a request body/header is not a substitute for TLS, request signing, rotation, replay protection, or a restrictive deployment design. Never put the secret in `NEXT_PUBLIC_*`, browser JavaScript, logs, or `GOOGLE_APPS_SCRIPT_API_URL` client code. Use Vercel server-only environment variables. If the Apps Script web app must be callable anonymously at the Google deployment layer, require a strong signed request on every operation, reject expired/replayed signatures, and expose no data path that bypasses that verification. Validate this design with a security review before live use.

## Proposed Apps Script project files

Add these files only after the school approves the schema and backend trust model:

- `apps-script/appsscript.json` — V8 runtime, timezone `Asia/Karachi`, explicit scopes only.
- `apps-script/Code.gs` — minimal `doGet`/`doPost` dispatch, content-type/body size validation, common JSON envelope, correlation ID, safe error mapping. `doGet` should serve only a non-sensitive health/version response or deny unsupported operations.
- `apps-script/Config.gs` — Script Properties access for test/production spreadsheet ID and signing secret; never commit actual values.
- `apps-script/Auth.gs` — request signature verification, timestamp/nonce replay checks, server-derived principal/session verification contract, role/ownership guard helpers. Never trust browser `role` or `userId` fields.
- `apps-script/Schema.gs` — required tab/header manifest, schema version validation, cached header indexes, explicit allowlist of tab keys; never accept arbitrary spreadsheet IDs or tab names from callers.
- `apps-script/Validation.gs` — required-field, enum, ID, date, numeric range, request-size, text-length, foreign-key and state-transition validation.
- `apps-script/SheetsRepository.gs` — batched reads/writes, allowlisted tabs/columns, lock-protected unique checks, version checks and safe spreadsheet error translation.
- `apps-script/Operations.gs` — one explicit operation registry mapped to authorization and validators; no arbitrary function dispatch from client input.
- `apps-script/Audit.gs` — append minimized sensitive-operation events without secrets or complete student payloads.
- `apps-script/Files.gs` — Drive file operations, allowlisted private root/folder IDs from Script Properties, MIME/size validation, authorization on every access.
- `apps-script/Backups.gs` — only after schema and Drive setup: snapshot, integrity verification, retention, restore dry-run, pre-restore snapshot and recovery journal.
- `apps-script/Tests.gs` or a separate isolated test harness — synthetic-only integration tests; no destructive production tests.

These are proposed files, not present files. Do not deploy a partially implemented dispatch table and imply the listed modules work.

## Endpoint contract

All requests should use a consistent envelope:

- Success: `{ ok: true, data: ..., requestId: "..." }`
- Failure: `{ ok: false, error: { code: "...", message: "Safe user-facing message" }, requestId: "..." }`

Use HTTP status codes where the platform permits. Apps Script ContentService response status behavior is limited; preserve explicit `ok` and stable error codes in the body, and have the BFF map trusted backend codes to proper HTTP statuses. Never expose stack traces, spreadsheet IDs, file IDs, secrets, or raw Google exceptions.

The frontend routes currently present are:

| Next.js endpoint | Intended operation | Apps Script operation to implement |
|---|---|---|
| `POST /api/auth/login` | Login | `auth.login` only through a reviewed BFF/auth design; issue secure HttpOnly session at BFF, not a token stored in browser storage |
| `POST /api/auth/recovery-requests` | Recovery request | `auth.requestRecovery`, generic response, rate-limited verified delivery flow |
| `POST /api/registration-requests` | Request access/registration | `registration.submit` or consolidate with admissions only after school confirms their meaning; no public Admin creation |
| `POST /api/admissions` | Submit application | `admissions.submit` with idempotency key, minimum data and no auto student login |
| `GET /api/admissions` | Public lookup | Disabled unless a high-entropy reference workflow is approved; return minimal status only |
| `GET /api/notices` | Public notices | `notices.listPublic`, published/public audience only |
| `/api/admin/{operation}` | Admin operations | Explicit allowlisted operations; require Admin session and per-operation authorization |
| `/api/teacher/{operation}` | Teacher operations | Explicit allowlist; derive teacher from session and check `TeacherAssignments` for every class/subject action |
| `/api/student/{operation}` | Student operations | Derive student from session; never accept a caller-selected student ID for own-record operations |
| `/api/admin/backups` | Backup operations | `backup.status/create/schedule/retention/dryRun/restore` only with Admin permission, step-up confirmation, audit and lock |

No Apps Script endpoint is currently deployed or verified. The operation names above are proposed contracts, not existing functions.

## Authorization matrix to enforce in backend

- `public`: only approved public website content and explicitly public notices; no student lookup by GR number.
- `admin`: only active Admin session; account status and session version checked; sensitive operations audited.
- `teacher`: session-derived teacher ID plus current assignment for requested class/subject/year; cannot publish results or read unassigned students.
- `student`: session-derived student ID; only own permitted profile, attendance, published results, assigned homework, published class timetable/notices and approved ID card.
- Backup restore: Admin plus fresh step-up authentication/confirmation, verified source backup, verified pre-restore backup, dry-run and journal.

A role string in a request body is never authorization. A valid session alone is not sufficient for a record outside the principal's scope.

## Storage and concurrency rules

1. Open only the spreadsheet ID in server-side Script Properties; never accept a spreadsheet ID from request data.
2. Map logical tab keys to hard-coded/manifest tab names; never pass arbitrary client-supplied sheet names to `getSheetByName`.
3. Validate all foreign keys and status transitions server-side.
4. Batch `getValues()` and `setValues()` for list/bulk operations; avoid one spreadsheet call per student.
5. Use `LockService` around admission conversion, unique ID/reference issuance, attendance session creation/submission, idempotency records, backup/restore and other read-check-write operations.
6. Enforce stable idempotency keys and store operation results so retries do not create duplicate admissions, attendance rows, student records or submissions.
7. Use version checks for edits; return `CONFLICT` on stale versions rather than silently overwriting another user's changes.
8. Keep missing attendance unmarked; keep missing exam marks null/unmarked.
9. Audit privileged changes with actor, action, entity ID, timestamp, outcome, request ID and reason where required; do not log full payloads.
10. Bound body size, array length, string length and batch sizes; paginate list operations and handle Apps Script execution quotas.

## Authentication implementation choice

Do not store plaintext passwords. The safest compatible option is to use a server-side authentication implementation with a vetted password-hashing algorithm (for example, Node's `scrypt` in the Next.js server runtime) and an HttpOnly, Secure, SameSite cookie signed/verified server-side. The school must approve whether credential hashes live in a restricted `Users` tab or a separately controlled identity store; no external database provider is assumed here. Apps Script must receive only an authenticated server-to-server principal/assertion, not a browser assertion. Sessions require expiry, rotation/revocation and logout invalidation; a signed stateless cookie without a revocation/session-version check is insufficient for this school portal.

Before choosing an exact credential/session storage design, confirm Vercel runtime/region constraints, deployment secrets, Apps Script web-app access behavior, and the school's Google Workspace/account ownership. Do not write a home-grown password scheme with a single SHA-256 digest.

## Deployment procedure (test first)

1. Create a separate Apps Script project owned by the school-controlled Google account. Do not paste code into an unknown production script.
2. Add the approved files, run syntax/unit checks and review requested OAuth scopes.
3. Create a test spreadsheet using the approved `docs/GOOGLE_SHEETS_SCHEMA.md` headers and a private test Drive folder; add only synthetic records.
4. Set test spreadsheet ID, private Drive root ID and signing key as **Script Properties**. Never place actual values in source control.
5. Deploy a test web app with the minimum feasible audience and execution identity; record deployment version/URL in the secure Vercel environment, not in committed code if treated as private configuration.
6. Configure Vercel Preview-only server environment variables for test URL/signing key. Keep them server-only; never prefix with `NEXT_PUBLIC_`.
7. Verify signed request, expired signature, replay, bad signature, oversized body, invalid operation, wrong role, wrong record ownership, schema mismatch and Google permission failures.
8. Run each workflow using synthetic accounts. Check the actual sheet after writes and compare IDs/status/versions.
9. Test backup and restore only against the test workbook and test Drive folder.
10. Promote only after review, school authorization and separate production configuration. No production deploy is performed by this plan.

## Required manual configuration (names only)

Vercel server-side variables to define after the architecture is approved:

- `SCHOOL_BACKEND_SERVER_URL` — server-only trusted Apps Script endpoint.
- `SCHOOL_BACKEND_SHARED_SECRET` — server-only high-entropy request-signing secret, if HMAC design is approved.
- `SCHOOL_SESSION_SIGNING_SECRET` — server-only session signing key if cookie sessions are implemented.
- `SCHOOL_ENVIRONMENT` — `test` or `production`.

Apps Script Script Properties (never committed):

- `SCHOOL_SPREADSHEET_ID`
- `SCHOOL_DRIVE_ROOT_FOLDER_ID`
- `SCHOOL_BACKEND_SHARED_SECRET` (matching test/prod signing secret as applicable)
- `SCHOOL_SCHEMA_VERSION`

Do not set these until actual code exists and the trust model is approved. `GOOGLE_APPS_SCRIPT_API_URL` is currently documented as an optional public integration variable; it is not a trusted privileged channel and should not be used for secrets.

## Integration acceptance tests

- Valid signed request succeeds; missing/invalid/expired/replayed signature fails closed.
- Browser cannot invoke Apps Script with a privileged secret.
- Forged role/user ID is ignored or rejected; session-derived principal is used.
- Student A cannot access Student B; teacher cannot access an unassigned class/subject.
- Unknown operation, spreadsheet ID, sheet key, column or state transition is rejected.
- Duplicate idempotency key returns original result or stable duplicate error without a second write.
- Concurrent admission conversion creates one student only.
- Missing attendance remains unmarked; missing marks remain null.
- Drive file access requires authorized owner/audience; unknown IDs do not reveal existence.
- Backup checksum/schema/count validation succeeds; incompatible restore is rejected; failed operations never report success.
- Test sheet and production sheet IDs cannot be confused by environment.
