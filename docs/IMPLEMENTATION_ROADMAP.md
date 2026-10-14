# Implementation Roadmap — From UI Snapshot to Integrated School System

**Current decision: NOT READY.** Preserve the existing frontend and fail-closed routes. Work in feature branches and a test-only Google workspace; do not import production data or deploy to production until the relevant stage is approved.

## Stage 0 — Repository and access baseline

1. Clone `https://github.com/noblepublicschooldadu-max/NPSD-SCRIPT-SHEET` into a separate directory. The remote `main` currently contains only a README; the supplied source folder has no `.git` metadata.
2. Copy/merge the audited local source into a new feature branch after reviewing a file diff. Preserve the remote README and never force-push.
3. Inspect the complete Git diff and scan for secrets and private data. Keep `.env`, `.env.*` except `.env.example`, credentials, keys, production exports and `.vercel` files out of Git.
4. Install dependencies and generate a package lockfile with the chosen package manager; commit it after review.
5. Run lint, full typecheck, tests, build and dependency audit. Record baseline failures before fixing them.

**Exit criteria:** project is reproducibly installed, has a reviewed branch/commit, and baseline CI results are recorded.

## Stage 1 — Approve data model and environments

1. School owner confirms whether a Google Sheet already exists. Export tab names and headers without student row data if possible.
2. Compare live headers against `docs/GOOGLE_SHEETS_SCHEMA.md`; produce a migration map and schema version. Do not create duplicate tabs or alter production sheets automatically.
3. Create separate test spreadsheet, test Apps Script project and private test Drive folder. Use synthetic records only.
4. Set up separate Vercel Preview and Production environments. Do not reuse test spreadsheet IDs, folder IDs or signing secrets in Production.

**Exit criteria:** written schema approval, isolated test resources, permissions documented, and no real student data in test fixtures.

## Stage 2 — Trusted backend boundary and authentication

1. Implement Next.js BFF session verification with HttpOnly, Secure, SameSite cookies, expiry, rotation/revocation and logout invalidation.
2. Decide and review credential storage and a vetted password-hashing implementation. No plaintext passwords, GR-number login shortcuts or public Admin registration.
3. Implement server-to-server request signing between Vercel and Apps Script using server-only secrets, timestamp/nonce replay checks, request size bounds and stable error envelopes.
4. Implement `Users`, account status, role guard and session-derived principal; never trust browser `role`, `userId`, class ID or student ID without authorization checks.
5. Add generic password-recovery responses, verified delivery, single-use expiring token hashes and rate limits.

**Exit criteria:** direct API authorization matrix passes in test environment for anonymous/Admin/Teacher/Student and cross-record negative tests.

## Stage 3 — Core school structure and admission

1. Implement schema health checks and allowlisted `SheetsRepository`.
2. Implement academic years, classes/sections, subjects, teachers and teacher assignments.
3. Implement admissions submission with idempotency, private review, explicit decision transitions and duplicate-safe conversion into Students.
4. Provision a Student login only through a separate authorized process; never automatically from a public application.

**Exit criteria:** Workflow A/B passes against the test spreadsheet; all writes are inspected; duplicate retries create one application/student only.

## Stage 4 — Attendance and academic work

1. Implement attendance sessions and batch writes with `LockService`, stable operation keys and optimistic versions.
2. Decide offline queue persistence and user-visible pending/synced/failed states. Keep queued records minimal; never claim sync before server confirmation.
3. Implement homework, submissions and Drive file permissions.
4. Implement exams, marks validation, review and separate Admin publication; null marks remain unmarked.
5. Implement timetable server-side conflict checks and explicit draft/published states.

**Exit criteria:** Workflows C–F pass, including duplicate/retry/permission failure tests.

## Stage 5 — Notices, reports, ID cards and files

1. Implement public notices with strict audience allowlist and minimum public fields.
2. Implement reports from authorized source queries; compare totals against synthetic source rows; enforce the same access policy for CSV/print exports.
3. Implement ID cards only after approved student data and private photo access work. QR must contain only opaque, revocable high-entropy token.
4. Implement private upload/download routes with category allowlists, limits and record-level permission checks.

**Exit criteria:** Workflows G/H pass and privacy tests prove no unpublished/private data leaks through direct endpoints or exports.

## Stage 6 — Backup, audit and recovery

1. Implement append-only audit events for sensitive operations and minimized safe logging.
2. Implement test-only snapshot, manifest, checksums, schema version, record counts and read-back verification.
3. Implement retention under lock, preserving protected verified backups.
4. Implement restore dry-run, verified pre-restore backup, recovery journal and isolated restore. Never run destructive restore tests on production.

**Exit criteria:** isolated backup/restore drill passes and source-vs-restored IDs/counts/relationships are compared and signed off.

## Stage 7 — Reliability, QA and pilot

1. Complete E2E workflow suite using isolated accounts and synthetic data.
2. Add API failure injection, expired session, permission denial, malformed/oversized body, partial Sheets/Drive failure and retry tests.
3. Run a bounded load test against test deployment with 1–5 concurrent staff and realistic batch sizes; record p50/p95, errors and quotas. Do not invent benchmarks.
4. Complete desktop/mobile/keyboard/English/Urdu/Sindhi RTL manual QA.
5. Install dependencies from lockfile, run lint/typecheck/tests/build/audit and inspect output. Verify security headers and protected-route cache policy on Preview.
6. Have authorized school staff approve data migration, training, incident response, backup and go/no-go checklist.

**Exit criteria:** controlled pilot may be considered only after essential workflows and authorization pass in the isolated environment, restore is verified, and school sign-off is recorded.

## Priorities

- **P0:** Git baseline, backend/auth design, isolated test resources, session and role authorization.
- **P1:** schema approval, core data, admissions, classes/assignments, attendance reliability.
- **P2:** homework, exams/results, timetable, notices, reports and private file service.
- **P3:** ID QR, backup scheduling/retention/restore, monitoring, performance and pilot training.

## Do not do

- Do not expose a privileged Apps Script secret to the browser.
- Do not accept arbitrary spreadsheet IDs, tab names or Drive file IDs from clients.
- Do not treat frontend validation as the authorization boundary.
- Do not seed fake student data or claim persistence without a confirmed server response.
- Do not modify production tabs/sharing/deployment, import real student data or restore over production without explicit approval.
