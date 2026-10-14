# Phase 17 — Integration Test Report

**Project:** SEF Primary School Management System (NPSD School Portal)  
**Assessment date:** 2026-10-14  
**Assessment scope:** source archive supplied for Phase 16; local tests only. No production accounts, Google Apps Script deployment, live Sheets workbook, Drive folder, Vercel project, or test credentials were available.  
**Final readiness status: NOT READY** — core API routes deliberately return `503 NOT_CONFIGURED`; end-to-end workflows cannot be completed against a backend.

## Executive result

The source contains public website pages, localization support, role-specific portal interfaces, management components, validation/data contracts, and a Node test suite. The API layer intentionally fails closed when the secure session verifier and trusted Apps Script channel are absent. This is safer than returning fabricated records or claiming writes succeeded, but it means this is not an integrated school information system yet.

- Local automated test command: `npm test` (`node --test tests/*.test.cjs`) — **134 passed, 0 failed, 0 skipped** after adding five Phase 17 integration-readiness checks.
- Live API/Google integration: **not run**; no Apps Script source/deployment or test workbook was present.
- Browser E2E/mobile visual testing: **not run**; no browser automation configuration or installed app dependencies were available.
- Performance/load testing: **not run**; no isolated backend target was available.
- Backup/restore drill: **not run**; backup endpoint is fail-closed and no test Drive folder exists.

## Module inventory

Statuses are based on source inspection and test evidence, not the presence of a page alone.

| Module | Source found | Status | Evidence / limitation |
|---|---|---|---|
| Public school website | `src/app/page.tsx`, site components | Partially implemented | Static/public content exists; no live CMS/backend verification. |
| English/Urdu/Sindhi localization | `src/lib/i18n/messages.ts`, language provider/switcher | Partially implemented | Translation labels and RTL support have unit coverage; visual QA on real mobile browsers not run. |
| Login | login page/form and `/api/auth/login` | Backend missing / blocked | Endpoint validates shape then returns `503 NOT_CONFIGURED`; no credential verifier or session issuer. |
| Registration | register form and `/api/registration-requests` | UI + validation only | Endpoint does not persist requests or provision accounts; returns 503. |
| Password recovery | recovery form and `/api/auth/recovery-requests` | UI + validation only | No verified delivery/token service; returns 503. |
| Authentication/session lifecycle | `src/lib/api/auth-service.ts`, auth contracts | Backend missing | No operational session verifier, expiry/revocation or logout invalidation was verified. |
| Role permissions | admin/teacher/student API routes | Backend missing; fail-closed | Direct requests to role APIs return 503; cannot verify positive or negative RBAC decisions against a backend. |
| Admin dashboard | `admin-console.tsx`, admin API catch-all | UI/contracts only | No live counts or mutations; admin API returns 503. |
| Student management | admin UI/contracts | UI/contracts only | No live student CRUD or Sheets integration. |
| Teacher management | admin UI/contracts | UI/contracts only | No live teacher CRUD or assignment service. |
| Classes, sections, academic years | academic contracts/UI | UI/contracts only | Validation tests exist; no persisted records or server-side conflict enforcement. |
| Admissions | form, contracts, admin management, `/api/admissions` | UI + validation only | Submit endpoint explicitly says no application was saved and returns 503; approval/conversion cannot be tested. |
| Student ID cards / QR | ID card component/contracts | Partially implemented | Card contract tests exist; QR token verification API is unavailable, so verification/scanning is disabled. |
| Attendance | teacher/admin UI, contracts, offline queue | UI/contracts only | Batch validation and in-memory queue are tested; no backend sync or persisted attendance; retries cannot be end-to-end tested. |
| Homework / assignments | teacher UI, admin management, contracts | UI/contracts only | Validation tests exist; no storage, assignment access enforcement, submissions or attachment authorization. |
| Examinations / results | admin/teacher UI, contracts | UI/contracts only | Marks validation exists; no persisted marking, review workflow or publication authorization. |
| Timetable | academic scheduling UI/contracts | UI/contracts only | Local conflict rules tested; no backend persistence or published-view permission check. |
| Notices / communication | notice UI, `/api/notices`, admin notice management | UI/contracts only | Public notice endpoint returns 503; no publication, audience filtering, attachment service or message delivery. |
| Reports / exports | reports UI/contracts | UI/contracts only | Aggregation/CSV helpers have unit coverage; API returns 503 and there are no live totals to reconcile. |
| Backup / restore | backup dashboard/contracts, `/api/admin/backups` | UI/contracts only | API returns 503; no backup creation, integrity verification, retention deletion or restore drill. |
| Audit logs | contracts/documented backend requirements | Backend missing | No deployed audit store or verified immutable/append-only event trail. |
| Google Apps Script endpoints | none found (`*.gs`, `appsscript.json`) | Backend missing | No implementation in supplied repository snapshot. |
| Google Sheets schemas | none found | Not verifiable | No workbook/schema or sample export available; no migration was attempted. |
| Google Drive operations | none found | Backend missing / not verifiable | No file service, folder IDs, permissions or test files available. |
| Vercel deployment | `next.config.ts`, `.env.example` | Partially configured | Next config exists; no `vercel.json`, deployment metadata, production URL or dashboard access in snapshot. |

## API integration findings

### Current route inventory

- `GET/POST /api/admin/[...operation]` (also PUT/PATCH/DELETE): returns `503 NOT_CONFIGURED`.
- `GET/POST /api/teacher/[...operation]` (also PUT/PATCH/DELETE): returns `503 NOT_CONFIGURED`.
- `GET/POST /api/student/[...operation]` (also PUT/PATCH/DELETE): returns `503 NOT_CONFIGURED`.
- `POST /api/admissions`: validates JSON/fields and admission contract, then returns 503 without saving.
- `GET /api/admissions`: disabled pending secure lookup.
- `GET /api/notices`: disabled pending trusted public-notice source.
- `POST /api/auth/login`: validates request shape then returns 503.
- `POST /api/auth/recovery-requests`: validates request shape then returns 503.
- `POST /api/registration-requests`: validates request shape then returns 503.
- `GET /api/auth/login`: returns 405.
- Backup operations: all methods return 503 until server session verification and trusted backend exist.

`src/lib/api/http.ts` provides bounded JSON reading and no-store API responses. The front end generally uses same-origin API routes. `GOOGLE_APPS_SCRIPT_API_URL` is documented only for optional public integrations; server-only backend values are placeholders. There is no configured trusted Apps Script channel to compare request/response schemas against.

### Data model and migration

Application contracts exist under `src/lib/*/contracts.ts`, but no authoritative Sheet tab names, column headers, formula conventions, or deployed workbook were available. No Sheet schema change or production migration was performed. Before integration, approve a versioned schema manifest and reconcile each contract with the actual workbook. Do not infer a workbook schema from UI types.

## End-to-end workflow results

| Workflow | Result | Reason |
|---|---|---|
| A — Admission to student record | **Blocked** | Admission POST returns 503; no Admin session, storage, approval or conversion backend. |
| B — Student/teacher setup | **Blocked** | Admin APIs return 503; no class/assignment persistence or authenticated test identities. |
| C — Attendance | **Unit-tested only; E2E blocked** | Validation, retry identifiers and in-memory offline queue have tests; no durable sync endpoint. |
| D — Homework | **Unit-tested only; E2E blocked** | Contract validation exists; no authorized assignment storage or submission service. |
| E — Examinations/results | **Unit-tested only; E2E blocked** | Marks validation exists; no result persistence, review or publication API. |
| F — Timetable | **Unit-tested only; E2E blocked** | Local conflict validators tested; no server-backed publishing or visibility checks. |
| G — Notices/admissions | **Blocked** | Both public and administrative API integrations are unavailable. |
| H — Reports/exports | **Helper tests only; E2E blocked** | Report contracts/aggregation/CSV protections are tested, but API returns 503 and no real records exist. |
| I — Backup/recovery | **Blocked** | Backup API returns 503; no backup artifact or isolated restore target exists. |

No workflow is labelled passed end-to-end. No live Google Sheets writes, public data exposure checks against a deployed endpoint, or destructive operations were performed.

## Authentication / authorization matrix

`503 NOT_CONFIGURED` is an availability guard, not proof that the eventual RBAC policy is correct. The current API routes deny all operations until configured.

| Operation | Anonymous | Admin | Teacher | Student | Evidence/status |
|---|---|---|---|---|---|
| Student records | No data served | Not yet usable | Not yet usable | Not yet usable | All role API operations unavailable; positive RBAC unverified. |
| Teacher records | No data served | Not yet usable | Not yet usable | Not yet usable | Backend missing. |
| Attendance | No data served | Not yet usable | Not yet usable | Not yet usable | Backend missing; offline queue only in memory. |
| Homework | No data served | Not yet usable | Not yet usable | Not yet usable | Backend missing. |
| Exams/results | No data served | Not yet usable | Not yet usable | Not yet usable | Backend missing. |
| Admissions | No application lookup/write | Review unavailable | Not yet usable | Not yet usable | Submit and lookup fail closed. |
| Notices | No notices returned | Publish unavailable | Publish unavailable | No restricted feed | Public feed returns 503. |
| Reports/exports | No data served | Not yet usable | Not yet usable | Not yet usable | Admin API unavailable. |
| ID cards | No verification service | Not yet usable | Not yet usable | Not yet usable | QR token validation disabled. |
| Backup/restore | No data served | Not yet usable | Not permitted by current unavailable API | Not permitted by current unavailable API | All methods return 503. |
| Administrative settings | No data served | Not yet usable | Not permitted by current unavailable API | Not permitted by current unavailable API | Admin API unavailable. |

## Reliability and security observations

- Most API operations deliberately fail closed, preventing false successful writes. Keep this behavior until a trusted backend is configured.
- The attendance offline queue is in-memory only; a reload can lose pending work. Do not use it for operational attendance until persistence, replay, idempotency and visible reconciliation are implemented and tested.
- The client can test contract validation, but no Sheets locking, transactional write, audit-log durability, Apps Script quota behavior or Drive permissions can be tested without backend code and an isolated test deployment.
- CSV formula-injection handling has unit tests. The generated export still needs review with the target spreadsheet software and real export path.
- No performance timings or concurrency numbers were collected. There was no test backend, and no load test was run against production.
- Mobile viewport, keyboard accessibility, contrast and Urdu/Sindhi visual layout checks require a browser session and were not performed here.

## Quality commands and actual outcomes

| Command | Result |
|---|---|
| `npm test` (`node --test tests/*.test.cjs`) | **134 passed, 0 failed, 0 skipped** including five Phase 17 integration-readiness checks. |
| `npm run lint` | **Blocked:** `eslint: not found` because dependencies are not installed. |
| `npm run typecheck` | **Blocked:** Next.js, React and Node type declarations are missing; resulting JSX/type diagnostics cannot be treated as a clean check. |
| `npm run build` | **Blocked:** `next: not found`; no production build produced. |
| `npm audit --audit-level=low` | **Blocked:** `ENOLOCK`; no package lockfile exists. No vulnerability count is available. |
| Browser E2E / integration / load test | Not run; no browser test configuration, dependencies or isolated backend deployment. |
| ZIP integrity | `unzip -t npsd-school-public-phase17.zip` — passed; no compressed-data errors. |

## Required before pilot

1. Implement and independently review the server-side session verifier, role/record-level authorization and logout/expiry behavior.
2. Supply the actual Apps Script source and configure a dedicated test deployment with synthetic data and restricted test workbook/Drive folder.
3. Add server-side idempotency, locking, audit events and safe retry semantics for attendance, admission conversion, results and restore.
4. Reconcile contracts with a school-approved Sheet schema manifest; no implicit migration.
5. Implement secure private file upload/download and verify audience/ownership checks.
6. Create a lockfile, install pinned dependencies, and rerun lint, typecheck, build and dependency audit.
7. Run the complete workflow matrix against the isolated environment, including direct API negative tests for all four roles.
8. Complete mobile/RTL/accessibility QA and a measured load test for approximately 1,000 synthetic students and 1–5 concurrent staff.
9. Complete an isolated backup/restore drill and school-authorized go/no-go review.
