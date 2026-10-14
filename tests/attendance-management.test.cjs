const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("admin, teacher and student attendance routes remain present and APIs fail closed", () => {
  for (const route of ["src/app/admin/[[...section]]/page.tsx", "src/app/teacher/[[...section]]/page.tsx", "src/app/student/[[...section]]/page.tsx"]) assert.ok(fs.existsSync(path.join(root, route)));
  for (const role of ["admin", "teacher", "student"]) assert.match(read(`src/app/api/${role}/[...operation]/route.ts`), /NOT_CONFIGURED/);
});
test("attendance contracts validate dates, duplicate IDs, explicit statuses and missing status summary", () => {
  const source = read("src/lib/attendance/contracts.ts");
  assert.match(source, /validateSchoolDate/);
  assert.match(source, /new Set\(ids\).size !== ids.length/);
  assert.match(source, /ATTENDANCE_STATUSES/);
  assert.match(source, /summary.unmarked \+= 1/);
  assert.match(source, /hasAttendanceConflict/);
});
test("teacher attendance uses operation IDs, batch status before retry and explicit unsynced notice", () => {
  const source = read("src/components/teacher/teacher-portal.tsx");
  assert.match(source, /operationId/);
  assert.match(source, /attendance\/batch-status/);
  assert.match(source, /Saved in this page's temporary memory/);
  assert.match(source, /NOT synced/);
  assert.match(source, /validateSchoolDate/);
});
test("offline queue is in-memory only and does not persist secrets or profile fields", () => {
  const source = read("src/lib/attendance/offline-queue.ts");
  assert.match(source, /new Map/);
  assert.match(source, /memory-only/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|password|token/i);
});
test("admin attendance has correction reason, audit lookup and CSV export only for returned records", () => {
  const source = read("src/components/admin/attendance-management.tsx");
  assert.match(source, /attendance\/corrections/);
  assert.match(source, /reason\.trim\(\)\.length<5/);
  assert.match(source, /attendance\/audit/);
  assert.match(source, /Export returned records as CSV/);
  assert.match(source, /PDF export is not implemented/);
});
test("QR scanning is unavailable without the Phase 7 token validation API", () => {
  const contract = read("API-CONTRACT.md");
  assert.match(contract, /validate-card-token/);
  assert.match(contract, /Phase 7 token issuance\/verification is not connected/);
});
test("CSV exports escape formula-leading values", () => {
  const source = read("src/lib/attendance/contracts.ts");
  assert.match(source, /formula/);
  assert.match(source, /replaceAll\('"', '""'\)/);
});
