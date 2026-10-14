# Production Readiness Checklist — SEF Primary School Management System

**Assessment date:** 2026-10-14  
**Decision:** **Not ready for production.** Current protected API endpoints intentionally return `503 NOT_CONFIGURED`. Do not enter real student or guardian data into this build until the backend and identity boundary have been implemented and independently verified.

## 1. Status overview

### Verified complete in this source snapshot

- [x] Repository uses Next.js 15, React 19 and TypeScript; scripts exist for lint, typecheck, tests and build.
- [x] `.env.example` contains variable names with blank placeholder values, not credential values.
- [x] `.gitignore` excludes `.env`, `.env.*` (except `.env.example`), `.vercel/`, build output and dependency folders.
- [x] Protected Admin, Teacher, Student and backup API route handlers fail closed with `503 NOT_CONFIGURED`.
- [x] Login, recovery, registration and admission submissions do not create a session, save an application, or issue a successful receipt while the backend is absent.
- [x] API JSON parsing now applies a 16 KiB streaming byte limit and validates JSON content type.
- [x] Baseline browser security headers are configured in `next.config.ts`.
- [x] CSV exports use formula-neutralization and quoting logic, including leading whitespace/control-character cases.
- [x] Tests use synthetic requests and source-only checks; no production student records are used.

### Requires manual verification

- [ ] Confirm the correct Vercel team/project, production domain, deployment protection, and branch promotion policy.
- [ ] Review every environment variable in Vercel Development/Preview/Production. Set only approved server-side values; never put secrets in `NEXT_PUBLIC_*`.
- [ ] Verify the production deployment's actual response headers and CSP behavior in a browser.
- [ ] Review GitHub repository access, branch protection, secret scanning, audit logs and commit history. The source snapshot alone cannot establish remote repository state.
- [ ] Inspect Google Workspace/account security, 2-step verification, recovery contacts and least-privilege editor access.
- [ ] Inspect actual spreadsheet sharing and Drive folder/file permissions. Ensure no student data, photos, admission documents or backups are accessible via “Anyone with the link” or public web publishing.
- [ ] Confirm the live workbook schema, ownership, formulas, protected ranges, sharing and backup requirements with school leadership before mapping endpoints.
- [ ] Approve school policies for account provisioning, student identity verification, guardian contact handling, records retention, data deletion, audit logs and incident response.

### Blocked / incomplete — production launch blockers

- [ ] Secure login, password verification, session creation/expiry/revocation and logout.
- [ ] Server-side authorization for Admin, Teacher, Student and Public roles on every operation.
- [ ] Trusted Vercel server-to-server transport to Apps Script that does not expose privileged secrets to browsers. Review Apps Script execution identity and deployment access; a public GAS URL is not an authentication mechanism.
- [ ] Apps Script source review: `doGet`, `doPost`, action allowlist, server-side input validation, sheet allowlist, record-level authorization, safe errors, audit events, concurrency locking and idempotency.
- [ ] Private student/teacher/admission data access, ID-card QR verification, attachment authorization and upload validation.
- [ ] Server-side validation and duplicate/race handling for attendance, admission applications/conversion, marks and result publication, timetable conflicts and other writes.
- [ ] Production dependency lockfile and dependency audit.
- [ ] Integration tests against a separate synthetic spreadsheet and restricted test Drive folder.
- [ ] Verified automated backups, read-back/checksum verification, retention, restore dry-run and successful restore drill to an isolated test spreadsheet.
- [ ] Monitoring, alerting, quota/failure handling and incident response runbook.

## 2. Environment variables (names only)

The repository's `.env.example` currently documents:

- `GOOGLE_APPS_SCRIPT_API_URL` — optional endpoint for **non-authenticated public integrations only**; not an authentication boundary. The current protected API handlers do not use it to authorize school records.
- `SCHOOL_BACKEND_SERVER_URL` — commented future server-only backend URL; not currently enabled.
- `SCHOOL_BACKEND_SHARED_SECRET` — commented future server-only secret; not currently enabled. Never expose it through client code or a `NEXT_PUBLIC_*` variable.

Do not fill these values based solely on this checklist. First decide and review the server-to-server trust model and confirm which values the deployed implementation actually reads. Keep separate values for local development, preview/test and production. Never paste real values into audit reports, issues or logs.

## 3. Google Apps Script deployment requirements

1. Locate and review the actual Apps Script project; this repository does not contain its source.
2. Document every `doGet`, `doPost` and action dispatched from them, with required role, input schema, output fields, rate limits and audit event.
3. Keep private data operations unavailable until requests are authenticated by a reviewed trusted channel. Do not rely on CORS, obscurity, a public deployment URL or a browser-held shared secret.
4. Define an explicit action allowlist and spreadsheet/tab allowlist. Never accept arbitrary spreadsheet IDs, sheet names, Drive IDs or destination folders from the browser.
5. Derive the actor and role from a verified session. Enforce class/subject assignment, student self-access, publication state, record ownership and Admin-only permissions inside the backend.
6. Validate all fields, dates, identifiers, enumerations, ranges and payload sizes server-side. Use `LockService`/version checks for concurrent writes and stable idempotency keys for retries.
7. Return only minimum necessary fields; use generic errors and avoid logging credentials or full personal records.
8. Deploy a versioned test endpoint first. Confirm execution identity, access controls, quotas, timeout behavior and failure handling using synthetic data.
9. Only promote after the authorization matrix and direct API tests pass; document the deployed version and rollback procedure.

## 4. Google account, Sheets and Drive controls

- Use a school-controlled account or approved shared drive with at least two authorized maintainers and 2-step verification.
- Limit Apps Script editors, spreadsheet editors and Drive folder managers to named staff with a school-approved need.
- Ensure production spreadsheet access is not public and is not published to the web. Review inherited folder permissions and link-sharing settings.
- Store private photos, admission documents and backups in restricted folders; do not expose public Drive URLs. Downloads must go through an authorized backend check or an approved short-lived access method.
- Validate upload type, size and content; generate server-side filenames; store outside public web roots; scan files where supported; prevent path/destination selection by clients.
- Protect formulas and ranges. Treat all imported values as untrusted and neutralize formula injection in CSV exports.
- Never run destructive tests, delete records, or change production sharing settings as part of a security test without explicit authorization and a tested recovery plan.

## 5. Admin account provisioning

1. Approve a written account owner and backup administrator process.
2. Create staff accounts through a verified, school-controlled process; no public registration flow may assign Admin role.
3. Verify identity out of band before issuing or resetting credentials. Use strong unique passwords and an approved secure password-hashing implementation if local passwords are used.
4. Require role assignment and staff/class/subject assignment to be server-side records, not browser-supplied claims.
5. Test onboarding, role change, disablement, session revocation and lost-device handling with test accounts.
6. Keep recovery messages generic; issue one-time, short-lived, single-use tokens through a verified channel. Never disclose whether an account exists.
7. Remove access promptly when staff leave or responsibilities change; review access periodically.

No Admin account can be provisioned by this repository snapshot because no working identity service is present.

## 6. Test and production separation

- Maintain distinct development, preview/test and production Vercel settings.
- Use a dedicated synthetic test spreadsheet and restricted test Drive folder; do not copy real student data into test environments unless explicitly approved and minimized.
- Use separate Apps Script deployments/properties for test and production; do not reuse test secrets in production.
- Restrict preview deployments that could expose internal school information; avoid connecting untrusted preview branches to production data.
- Run direct API authorization tests as anonymous, Admin, assigned teacher, unassigned teacher, student A and student B.
- Test failed/partial writes, timeouts, duplicate retries, stale versions and concurrent updates without destructive production requests.

## 7. Backup and recovery acceptance

- [ ] Define included Sheets/tabs and separately handled Drive files; explicitly exclude credentials, session tokens and secrets.
- [ ] Store backups in a restricted folder; verify the actual sharing permissions manually.
- [ ] Generate unique backup IDs and idempotency keys; lock concurrent backup/restore/retention operations.
- [ ] Verify each backup by reading it back and checking checksum, schema version, record counts and parseability before marking it verified.
- [ ] Keep retention policy approved by the school; protect the latest verified backup and backups currently involved in restore.
- [ ] Before restore, create and verify a pre-restore backup, require a separate confirmation, log the actor, and block concurrent mutations.
- [ ] Run a dry-run and restore only to an isolated test spreadsheet first; compare schema, counts and representative synthetic values.
- [ ] Test interruption/retry/resume and document recovery time and recovery point objectives.
- [ ] No backup or restore feature in this snapshot is operational; the backup API returns `503 NOT_CONFIGURED`.

## 8. Monitoring and failure handling

- Alert on repeated authentication failures, authorization denials, Apps Script errors/timeouts/quota exhaustion, failed writes, duplicate conflicts, backup verification failures and restore activity.
- Log request/correlation IDs, operation names, status and safe error codes; do not log passwords, session tokens, full student/guardian records, admission documents or private Drive links.
- Make success responses depend on confirmed backend writes, not optimistic UI state. For timeouts, check operation status using the same idempotency key before retrying.
- Monitor Apps Script execution logs and quotas under least-privilege access; set retention and access policies for logs.
- Establish a contact and escalation procedure for privacy incidents, incorrect records and data recovery.

## 9. Commands and evidence

Run from the project root after installing the declared dependencies from a committed lockfile:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

The current work environment does not contain `node_modules` and this repository snapshot has no lockfile. Tests that use the environment's globally available TypeScript transpiler may run, but full lint/typecheck/build and a reproducible dependency audit cannot be certified until dependencies are installed from a reviewed lockfile. See `docs/SECURITY_AUDIT.md` and the delivery summary for actual command outcomes.

## 10. Manual launch gate

- [ ] Security owner reviews the audit report and closes or formally accepts each finding.
- [ ] GAS code review and Google sharing/authorization review complete.
- [ ] Vercel env, domains, deployment protection and response headers checked against production.
- [ ] Account provisioning and authorization matrix tests pass, including negative tests.
- [ ] All school workflows are tested end-to-end against synthetic data and confirmed persisted records.
- [ ] Restore drill succeeds on an isolated spreadsheet and recovery instructions are signed off.
- [ ] School leadership approves privacy, retention, deletion and incident-response policies.
- [ ] No unresolved Critical/High findings; Medium risks have owners and due dates.

**Current readiness:** source-level remediation and local tests only. Not ready for a production launch; at most suitable for continued development in an isolated test environment with synthetic data.
