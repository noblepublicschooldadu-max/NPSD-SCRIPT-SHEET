const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function loadTs(file, mocked = {}) {
  const source = read(file);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const customRequire = (id) => Object.prototype.hasOwnProperty.call(mocked, id) ? mocked[id] : require(id);
  vm.runInNewContext(`(function(require,module,exports){${js}\n})`, { require: customRequire, module, exports: module.exports })(customRequire, module, module.exports);
  return module.exports;
}
const attendance = loadTs("src/lib/attendance/contracts.ts");
const reports = loadTs("src/lib/reports/contracts.ts", { "@/lib/attendance/contracts": attendance });

test("report date filters reject impossible dates and reversed ranges", () => {
  assert.equal(reports.validateReportFilters({ startDate: "2026-02-30", endDate: "", academicYearId: "", classId: "", sectionId: "", category: "attendance" }), "Choose a valid start date.");
  assert.equal(reports.validateReportFilters({ startDate: "2026-10-10", endDate: "2026-10-01", academicYearId: "", classId: "", sectionId: "", category: "attendance" }), "Start date must be on or before end date.");
  assert.equal(reports.validateReportFilters({ startDate: "", endDate: "", academicYearId: "", classId: "", sectionId: "S1", category: "attendance" }), "Choose a class before filtering by section.");
  assert.equal(reports.validateReportFilters({ startDate: "2026-10-01", endDate: "2026-10-14", academicYearId: "", classId: "C1", sectionId: "S1", category: "attendance" }), null);
});

test("attendance percentage excludes unmarked sessions and documents denominator", () => {
  const summary = reports.calculateAttendanceRate({ present: 7, late: 1, absent: 2, excused: 1, unmarked: 9, countExcusedInDenominator: false });
  assert.equal(summary.numerator, 8);
  assert.equal(summary.denominator, 10);
  assert.equal(summary.percentage, 8 / 10 * 100);
  assert.equal(reports.calculateAttendanceRate({ present: 7, late: 1, absent: 2, excused: 1, countExcusedInDenominator: true }).denominator, 11);
  assert.equal(summary.unmarkedExcluded, 9);
  assert.equal(reports.calculateAttendanceRate({ present: 0, absent: 0, countExcusedInDenominator: false }).percentage, null);
  assert.throws(() => reports.calculateAttendanceRate({ present: -1, absent: 0, countExcusedInDenominator: false }));
});

test("attendance summary removes duplicate retries by stable record ID", () => {
  const records = [{ recordId: "a", status: "present" }, { recordId: "a", status: "absent" }, { recordId: "b", status: "late" }];
  assert.deepEqual(reports.deduplicateAttendance(records).map((r) => r.recordId), ["a", "b"]);
});

test("enrollment count deduplicates linked students and excludes inactive or archived", () => {
  assert.equal(reports.countUniqueEnrollment([{ studentId: "S1", status: "active" }, { studentId: "S1", status: "active" }, { studentId: "S2", status: "inactive" }, { studentId: "S3", status: "archived" }, { studentId: "S4", status: "active" }]), 2);
});

test("missing exam marks are not converted to zero", () => {
  const summary = reports.summarizeMarks([80, null, undefined, 60]);
  assert.deepEqual({ ...summary }, { recorded: 2, missing: 2, average: 70 });
  assert.deepEqual({ ...reports.summarizeMarks([null]) }, { recorded: 0, missing: 1, average: null });
});

test("CSV escapes formula-leading content, quotes and newlines", () => {
  for (const dangerous of ["=SUM(A1:A2)", "+cmd", "-1+2", "@SUM(A1)", "\tformula", "\rformula"]) assert.ok(attendance.csvSafe(dangerous).startsWith("\"'"), dangerous);
  assert.equal(attendance.csvSafe('a"b'), '"a""b"');
  const report = { generatedAt: "2026-10-14T08:00:00Z", refreshedAt: "2026-10-14T07:59:00Z", period: { startDate: null, endDate: null }, appliedFilters: {}, source: "Apps Script", metrics: [{ key: "x", label: "=Unsafe", value: 3 }] };
  assert.match(reports.reportToCsv(report), /'=Unsafe/);
  assert.match(reports.reportToCsv(report), /\uFEFF/);
});

test("report payload validation rejects fabricated or incomplete shapes", () => {
  assert.equal(reports.isReportPayload({ metrics: [] }), false);
  assert.equal(reports.isReportPayload({ generatedAt: "x", refreshedAt: "y", source: "Sheets aggregate", period: { startDate: null, endDate: null }, appliedFilters: {}, metrics: [{ key: "n", label: "Students", value: 4 }] }), true);
  assert.equal(reports.isReportPayload({ generatedAt: "x", refreshedAt: "y", source: "Sheets aggregate", period: { startDate: null, endDate: null }, appliedFilters: {}, metrics: [{ key: "n", label: "Students", value: "4" }] }), false);
  assert.equal(reports.isReportPayload({ generatedAt: "x", refreshedAt: "y", source: "Sheets aggregate", period: null, appliedFilters: {}, metrics: [] }), false);
});

test("reports UI queries authorized backend, has loading/error/partial states and no demo figures", () => {
  const ui = read("src/components/admin/reports-management.tsx");
  assert.match(ui, /adminRequest<unknown>\(`reports\/summary/);
  assert.match(ui, /partialData/);
  assert.match(ui, /No demo values or charts are shown/);
  assert.match(ui, /Export displayed report as CSV/);
  assert.match(ui, /locale === "ur" \|\| locale === "sd"/);
  assert.doesNotMatch(ui, /\b(?:students|present|absent)\s*:\s*\d{2,}/);
});

test("admin dashboard links to reports and teacher report route is not introduced", () => {
  assert.match(read("src/components/admin/admin-console.tsx"), /ReportsManagement/);
  assert.match(read("src/components/admin/admin-console.tsx"), /School performance reports/);
  assert.equal(fs.existsSync(path.join(root, "src/app/teacher/reports/page.tsx")), false);
});

test("report API remains fail-closed until trusted backend is configured", () => {
  assert.match(read("src/app/api/admin/[...operation]/route.ts"), /NOT_CONFIGURED/);
  assert.match(read("API-CONTRACT.md"), /Phase 14 — School reports, analytics and performance dashboard/);
});
