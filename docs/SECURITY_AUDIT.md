# Phase 16 — Security Audit Report

**Assessment date:** 2026-10-14  
**Scope:** Source snapshot in this repository only; no production Vercel project, deployed Apps Script, live Google Sheet, Drive folder, account configuration, or production student data was available to inspect.  
**Overall decision:** **Not production-ready.** The repository is fail-closed for authentication and private data APIs, but that also means core school workflows are not operational. This report does not certify a live deployment.

## Executive summary

The application is a Next.js 15 / React 19 / TypeScript frontend with public information pages, login/recovery/registration/admissions forms, and Admin/Teacher/Student portal interfaces. The API route files in this snapshot deliberately return `503 NOT_CONFIGURED` for protected school operations and authentication. There is no Apps Script source (`Code.gs` / `appsscript.json`), no deployed endpoint configuration evidenced in the repository, no workbook schema, and no Drive implementation. Consequently, no actual password verifier, session issuer/validator, backend role authorization, sheet access, private file access, or backup/restore operation could be verified.

No live student data is returned by the protected API stubs in this repository snapshot. That is a useful fail-closed boundary, but it is not a substitute for a working authenticated system. The Admin/Teacher/Student shells and public forms can be reached as pages; protected data operations remain unavailable.

### Severity definitions

- **Critical:** likely catastrophic compromise or broad exposure, supported by evidence.
- **High:** major security control absent or a production-blocking risk.
- **Medium:** meaningful weakness with limited or conditional impact.
- **Low:** defense-in-depth or operational improvement.

## Findings

### SEC-001 — No operational authentication/session verifier in this repository

- **Severity:** High (production blocker; no evidence of a working authentication service)
- **Affected components:** `src/app/api/auth/login/route.ts`, `src/app/api/auth/recovery-requests/route.ts`, `src/app/api/admin/[...operation]/route.ts`, `src/app/api/teacher/[...operation]/route.ts`, `src/app/api/student/[...operation]/route.ts`, `src/app/admin/[[...section]]/page.tsx`, `src/app/teacher/[[...section]]/page.tsx`, `src/app/student/[[...section]]/page.tsx`.
- **Evidence:** login returns `503 NOT_CONFIGURED`; Admin, Teacher and Student route handlers return `503 NOT_CONFIGURED` for GET/POST/PUT/PATCH/DELETE. The repository contains no session verifier, cookie session issuer, password hashing/verification service, or Apps Script source.
- **Impact:** legitimate staff/students cannot sign in or use protected workflows. Security guarantees for a future implementation are not yet established.
- **Recommended fix:** implement a reviewed same-origin server-side session boundary with `Secure; HttpOnly; SameSite` cookies, expiry and revocation, and independently enforced Apps Script role/record authorization. Never accept role or identity from browser fields.
- **Fixed?:** No; intentionally remains disabled rather than creating insecure placeholder authentication.
- **Verification:** direct route-handler tests return `503 NOT_CONFIGURED` for all protected methods; UI route text states access is denied by default. No live authentication test was possible.

### SEC-002 — Google Apps Script, spreadsheet and Drive security cannot be audited from source

- **Severity:** High (production blocker / unverified external configuration)
- **Affected components:** all school data operations, attachments, reports, admissions, student ID verification, backups and restore.
- **Evidence:** no `Code.gs`, `appsscript.json`, workbook, Drive integration or deployed GAS endpoint configuration is present in this source snapshot. `API-CONTRACT.md` describes proposed contracts but is not an implementation.
- **Impact:** no evidence can establish server-side authorization, allowlisted sheets, spreadsheet sharing, private Drive permissions, upload restrictions, data minimization, rate limiting, idempotency or restore safety.
- **Recommended fix:** audit the deployed Apps Script project and real Google permissions; add integration tests against a separate synthetic test spreadsheet and Drive folder before enabling routes.
- **Fixed?:** No; cannot be fixed safely without the actual backend and Google resources.
- **Verification:** repository file inventory; no live Google resources accessed or changed.

### SEC-003 — Request JSON body limit could be bypassed when `Content-Length` was absent

- **Severity:** Medium
- **Affected component:** `src/lib/api/http.ts` and JSON-consuming public routes.
- **Evidence:** prior implementation relied only on `Content-Length` and then called `request.json()`, which does not enforce a byte limit when the header is absent or inaccurate.
- **Impact:** oversized request bodies could consume unnecessary server resources on public form endpoints.
- **Recommended fix:** enforce a byte limit while streaming the request body, validate content type and reject malformed JSON.
- **Fixed?:** Yes in the current source snapshot.
- **Verification:** `tests/phase16-security.test.cjs` exercises a request without relying on `Content-Length`, invalid content type, malformed JSON and the 16 KiB limit; run result is recorded in the delivery summary.

### SEC-004 — Site-wide security response headers were not configured

- **Severity:** Medium
- **Affected component:** `next.config.ts`.
- **Evidence:** prior configuration disabled the `X-Powered-By` header and enabled React strict mode but did not define a site-wide CSP, frame protection, HSTS, or Permissions Policy.
- **Impact:** weaker browser-enforced defense in depth against framing, content injection and insecure transport on a correctly configured HTTPS deployment.
- **Recommended fix:** add baseline security headers, test public assets and pages, and strengthen CSP with nonces when the app's inline-script requirements are understood.
- **Fixed?:** Partially; baseline headers are now configured in source. The current CSP intentionally allows inline scripts/styles for Next.js compatibility, so it is not a strict nonce-based CSP.
- **Verification:** automated source assertion checks for configured headers; a real browser/CSP smoke test and deployed-header inspection remain outstanding.

### SEC-005 — CSV formula injection guard did not cover formulas preceded by whitespace/BOM

- **Severity:** Medium
- **Affected components:** `src/lib/attendance/contracts.ts`, CSV exports in attendance and reports.
- **Evidence:** prior guard only checked the first character for `=`, `+`, `-`, `@`, tab or carriage return; whitespace/BOM-prefixed formula strings were not neutralized.
- **Impact:** opening a crafted export in spreadsheet software could interpret user-controlled values as formulas.
- **Recommended fix:** neutralize formula prefixes after leading whitespace/control characters and quote CSV cells.
- **Fixed?:** Yes in the current source snapshot.
- **Verification:** tests cover formula prefixes, tab/CR/newline, leading spaces, BOM and ordinary text. A manual Excel/LibreOffice compatibility check remains useful.

### SEC-006 — Dependency versions are not reproducibly locked; automated dependency audit unavailable

- **Severity:** Medium
- **Affected component:** package/deployment supply chain.
- **Evidence:** `package.json` uses semver ranges (including `next: ^15.5.0`) and no `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` is present. `node_modules` is absent in the work environment.
- **Impact:** builds may resolve different transitive versions; vulnerability status cannot be tied to the exact dependency tree.
- **Recommended fix:** choose the team's package manager, generate and commit its lockfile in a network-enabled controlled environment, run the package manager's audit, and review advisories before deploying. Avoid blind major-version upgrades.
- **Fixed?:** No.
- **Verification:** repository inventory confirmed no lockfile. Dependency audit is not claimed as passed.

### SEC-007 — No rate-limiting implementation is present for public form routes

- **Severity:** Medium (risk; abuse has not been observed)
- **Affected components:** `/api/auth/login`, `/api/auth/recovery-requests`, `/api/registration-requests`, `/api/admissions`.
- **Evidence:** route handlers perform validation but no durable shared rate-limit mechanism is implemented in the repository. Current routes fail closed before storing records.
- **Impact:** if the routes are later connected to real services without a rate limit, abuse could consume compute/quota or overwhelm school staff workflows.
- **Recommended fix:** configure edge/platform rate limits and implement server-side abuse controls appropriate to school policy; use generic recovery responses and audit suspicious patterns without logging submitted personal records.
- **Fixed?:** No; routes do not accept/store submissions currently. Do not rely on in-memory counters in serverless functions for production limits.
- **Verification:** static route review; no load or abuse test against production was run.

### SEC-008 — CSP permits inline scripts/styles and has not been validated in a deployed browser

- **Severity:** Low (defense-in-depth limitation)
- **Affected component:** `next.config.ts`.
- **Evidence:** configured CSP includes `'unsafe-inline'` for script/style compatibility and allows HTTPS images/fonts. It does not currently allow third-party `connect-src` destinations.
- **Impact:** CSP reduces some attack surface but does not provide the strongest protection against script injection; future external integrations may require explicit policy changes.
- **Recommended fix:** after dependencies/assets are installed, test pages and adopt Next.js nonce-based CSP where feasible. Keep third-party origins allowlisted narrowly.
- **Fixed?:** Partially (baseline policy present; strict policy not implemented).
- **Verification:** source assertion only; browser and deployed response validation remain outstanding.

## Additional review results

| Area | Source-based result | Status |
|---|---|---|
| Public website and metadata | Static school-information pages; React text rendering; no `dangerouslySetInnerHTML` usage found in source scan | Reviewed; no confirmed XSS sink found |
| Login/password storage | No password persistence or password verifier implementation found; login fails closed | Not operational; cannot validate password hashing or account provisioning |
| Password recovery | Fails closed with generic service-not-configured message; no token/delivery implementation | Not operational |
| Public registration | Validates fields and rejects unsupported fields; returns 503 without saving or issuing a receipt | Not operational |
| Admissions | Validates submitted fields; returns 503 without saving; no admission records or references are created | Not operational |
| Admin/Teacher/Student role checks | API route handlers fail closed; no backend role checks exist to test because no backend is included | Securely unavailable, not feature-complete |
| ID cards / QR verification | No trusted token-verification API or deployed GAS implementation present; no claim of private/public field filtering can be verified | Blocked/unverified |
| Attendance/offline sync | Queue is in-memory only according to implementation docs; write endpoints return 503; no persistence/idempotency backend to test | Blocked/unverified |
| Homework/exams/results/timetable | UI contracts and controls exist; backend routes fail closed; no live mutations or records | Blocked/unverified |
| Notices | Public notices endpoint returns 503 until approved public-only backend is configured | Fail-closed |
| Reports/exports | CSV export code uses a shared CSV escaping helper; source can be hardened and tested locally; real authorization of report data cannot be verified | Partially reviewed; backend blocked |
| Backups/restore | Dashboard only; backup API methods return 503; no backup file, trigger, checksum or restore operation is implemented | Not operational |
| Google Sheets access patterns | No `SpreadsheetApp` source available | Not verifiable |
| Google Drive upload/download | No `DriveApp`/Drive API implementation available | Not verifiable |
| Vercel environment variables | `.env.example` contains variable names and blanks only; local `.env*` is ignored except `.env.example`; dashboard values cannot be inspected here | Source checked; deployment unverified |
| Secrets and browser storage | No actual secret value found in `.env.example`; source scan found no `localStorage`/`sessionStorage` usage for tokens; no private secret can be verified against Vercel/GitHub | Source checked only |
| Open redirects / arbitrary server fetch | No user-controlled redirect or URL-fetch endpoint identified in source scan; external backend helper is unused in this snapshot | No confirmed issue found in reviewed source |
| Spreadsheet formula injection | Guard updated for leading whitespace/control characters | Fixed in source; tests added |
| CSRF | No cookie-backed authenticated write flow is implemented yet, so a production CSRF test is not possible. Same-origin browser clients are not themselves a CSRF control. | Must be designed with future cookie/session architecture |
| Personal data retention | No operational storage/logging implementation to inspect; retention policy needs school approval | Unverified / manual policy decision |

## Endpoint inventory

| Endpoint | Purpose | Current authentication / role | Input validation and response | Sensitive operations / result |
|---|---|---|---|---|
| `POST /api/auth/login` | Login | No auth possible yet; returns 503 after validation | JSON body, identifier/password types and field validation; unknown keys now rejected | No password check, session or cookie issued |
| `GET /api/auth/login` | Method response | Public | Returns 405 | No sensitive data |
| `POST /api/auth/recovery-requests` | Password recovery request | No auth; returns 503 | Identifier validated; unknown keys now rejected | No account lookup or token issued; no existence disclosure from a working recovery service can be tested |
| `POST /api/registration-requests` | Student registration request | Public; returns 503 | Allowlisted keys and registration validator | No record saved or portal activated |
| `POST /api/admissions` | Admission application | Public; returns 503 | Allowlisted keys, type checks, admission validator | No record saved/reference issued |
| `GET /api/admissions` | Application lookup | Public; returns 503 | No lookup parameter accepted in current handler | No application data returned |
| `GET /api/notices` | Public notice feed | Public; returns 503 | No query input | No notice data returned |
| `/api/admin/*` GET/POST/PUT/PATCH/DELETE | Admin data and mutations | No session verifier; every method returns 503 | Catch-all handlers do not parse input | No admin operation is executed |
| `/api/admin/backups` GET/POST/PUT/PATCH/DELETE | Backup metadata, create, schedule, retention, restore | No session verifier; every method returns 503 | No operation input accepted by route | No backup/restore operation is executed |
| `/api/teacher/*` GET/POST/PUT/PATCH/DELETE | Teacher records and mutations | No session verifier; every method returns 503 | Catch-all handlers do not parse input | No teacher operation is executed |
| `/api/student/*` GET/POST/PUT/PATCH/DELETE | Student self-service | No session verifier; every method returns 503 | Catch-all handlers do not parse input | No student record is returned or changed |

**Not present:** deployed Apps Script `doGet` / `doPost` handlers. This is a repository inventory result, not proof that no separate GAS project exists.

## Authentication and authorization conclusions

- **Passwords stored in plaintext:** no password storage implementation found. This does not prove how a separate identity source stores passwords.
- **Default Admin credentials / public Admin registration:** no Admin creation route or credentials found. Actual Google account and school account provisioning must be checked separately.
- **Student activation:** no activation workflow exists in this snapshot; cannot verify school identity proofing.
- **Recovery account enumeration:** current route returns the same `503 NOT_CONFIGURED` service state for valid-shaped identifiers; a working account-neutral recovery implementation is absent.
- **Session expiry/logout:** no session issuer, validator, expiry or logout revocation implementation exists to test.
- **Local storage tokens:** no `localStorage`/`sessionStorage` token storage found in the source scan.
- **Forged roles/IDs:** protected APIs do not accept them because the handlers return 503. Login/recovery now reject unexpected extra fields. This is not a substitute for backend authorization when routes are implemented.
- **Direct API calls:** route tests directly invoke the protected handlers and confirm fail-closed 503 responses; they do not test a deployed API.
- **Public/private record boundaries:** no real records are returned by the current API stubs. ID-card and public notice filtering must be verified against the actual backend before launch.

## Required privacy and retention decisions

Obtain school approval for: minimum required admission fields; who may view guardian contacts, addresses, dates of birth, attendance and marks; retention periods for rejected admissions and uploaded documents; access/audit log retention; backup retention; secure deletion; breach escalation and guardian notification. Do not log full request bodies, passwords, recovery identifiers, guardian contacts, student records or document URLs. Use opaque IDs in URLs and never place sensitive fields in public page metadata or analytics.

## Verification performed

- Source inventory of `src`, API routes, contracts, forms, export helpers, environment example and configuration.
- Static search for Apps Script handlers, spreadsheet/Drive APIs, secrets, browser storage, unsafe HTML sinks, URL redirects/fetches and CSV export code.
- Automated local tests cover bounded JSON parsing, fail-closed direct route calls, forged extra auth fields, security-header configuration and CSV formula handling.
- Existing project tests are run separately and summarized in the delivery response.
- **Not performed:** deployed HTTP header checks, authenticated role-matrix tests against GAS, live Google permissions review, real workbook/Drive checks, penetration test, load test, backup/restore drill, or Vercel environment audit.

## Command results for this audit

- `node --test tests/*.test.cjs`: **129 passed, 0 failed**.
- Targeted strict TypeScript check for changed core contracts/routes using the globally available TypeScript compiler and a temporary path-mapped config: **passed**.
- TypeScript/TSX transpile scan: **74 files, 0 syntax/transpile diagnostics**. This is not equivalent to full project typechecking.
- `npm run lint`: **blocked**, exit 127, `eslint: not found`.
- `npm run typecheck`: **blocked**, exit 2, missing `next`, `react` and their type declarations because dependencies are not installed. Reported JSX/type errors are therefore not reliable as application defects until the declared dependencies are installed.
- `npm run build`: **blocked**, exit 127, `next: not found`.
- `npm audit`: **blocked**, exit 1, `ENOLOCK` because no package lockfile exists. No dependency vulnerability count is claimed.
