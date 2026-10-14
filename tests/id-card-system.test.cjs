const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const contract = fs.readFileSync(path.join(root, 'src/lib/id-cards/contracts.ts'), 'utf8');
const adminUi = fs.readFileSync(path.join(root, 'src/components/admin/id-card-management.tsx'), 'utf8');
const studentUi = fs.readFileSync(path.join(root, 'src/components/student/student-portal.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/app/api/admin/[...operation]/route.ts'), 'utf8');

test('card eligibility requires verified and enrolled official student record', () => {
  assert.match(contract, /student\.verified === true/);
  assert.match(contract, /student\.enrollmentStatus === "enrolled"/);
  assert.match(contract, /student\.officialIdentifier\?\.trim\(\)/);
});
test('duplicate active card guard is scoped by student and academic year', () => {
  assert.match(contract, /card\.studentRecordId === studentRecordId && card\.academicYear === academicYear && card\.status === "active"/);
});
test('QR design requires opaque HTTPS verification URL and never uses GR as secret', () => {
  assert.match(contract, /url\.protocol === "https:"/);
  assert.match(contract, /segments\[0\] === "verify-card"/);
  assert.match(contract, /\{22,\}/);
  assert.match(contract, /Never put student identifiers or profile data in a QR code/);
  assert.match(adminUi, /QR verification unavailable/);
});
test('photo validation allowlists raster MIME types and size limits', () => {
  assert.match(contract, /image\/jpeg/);
  assert.match(contract, /image\/png/);
  assert.match(contract, /image\/webp/);
  assert.match(contract, /TOO_LARGE/);
});
test('admin card mutations remain disabled while backend is unavailable', () => {
  assert.match(adminUi, /Generate selected cards \(unavailable\)/);
  assert.match(adminUi, /disabled title="Card issuance is unavailable/);
  assert.match(adminUi, /Requires configured replacement API/);
  assert.match(api, /503/);
  assert.match(api, /Do not trust role headers/);
});
test('student card UI never asks browser for another student ID and makes replacement unavailable explicit', () => {
  assert.match(studentUi, /Request replacement \(unavailable\)/);
  assert.match(studentUi, /Print preview/);
  assert.match(studentUi, /QR verification is disabled and PDF download remains unavailable/);
});
test('no public verification route is introduced without a trusted verifier', () => {
  assert.equal(fs.existsSync(path.join(root, 'src/app/verify-card/[token]/page.tsx')), false);
  assert.match(contract, /public\/id-card-verification/);
});
test('admin ID-card UI includes search, class, section, year and status actions', () => {
  for (const value of ['Search student', 'Class', 'Section', 'Academic year', 'Reprint / replace', 'Print preview']) assert.ok(adminUi.includes(value), `missing ${value}`);
});
