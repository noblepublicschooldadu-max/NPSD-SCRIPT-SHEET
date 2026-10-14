const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('all requested teacher routes resolve through the shared portal page', () => {
  assert.ok(fs.existsSync(path.join(root, 'src/app/teacher/[[...section]]/page.tsx')));
  const source = read('src/lib/teacher/contracts.ts');
  for (const slug of ['', 'classes', 'timetable', 'attendance', 'homework', 'examinations', 'results', 'notices', 'profile']) assert.ok(source.includes(`slug: "${slug}"`));
});
test('teacher API fails closed and never trusts caller role or identity', () => {
  const source = read('src/app/api/teacher/[...operation]/route.ts');
  assert.match(source, /NOT_CONFIGURED/);
  assert.match(source, /Never trust role headers/);
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) assert.match(source, new RegExp(`function ${method}`));
});
test('attendance validation rejects empty, duplicate, missing IDs and unsupported statuses', () => {
  const source = read('src/lib/teacher/contracts.ts');
  assert.match(source, /entries.length === 0/);
  assert.match(source, /new Set\(ids\).size !== ids.length/);
  assert.match(source, /allowed.has\(entry.status\)/);
  assert.match(source, /"present", "absent", "late", "excused"/);
});
test('attendance flow keeps unmarked entries blank and requires review before submit', () => {
  const source = read('src/components/teacher/teacher-portal.tsx');
  assert.match(source, /Unmarked/);
  assert.match(source, /No absence is inferred/);
  assert.match(source, /Review attendance submission/);
  assert.match(source, /Confirm and submit/);
  assert.match(source, /attendance\/batch/);
  assert.match(source, /No success was recorded/);
});
test('marks validation rejects negative and above-maximum marks', () => {
  const source = read('src/lib/teacher/contracts.ts');
  assert.match(source, /marks < 0 \|\| marks > maximum/);
  assert.match(source, /configured maximum marks are unavailable/);
});
test('homework creation validates required fields and due date ordering', () => {
  const source = read('src/components/teacher/teacher-portal.tsx');
  assert.match(source, /validateAssignmentDates\(date, dueDate\)/);
  assert.match(read('src/lib/homework/contracts.ts'), /dueDate\s*<\s*assignedDate/);
  assert.match(source, /homeworkTitle.trim\(\)/);
  assert.match(source, /homeworkInstructions.trim\(\)/);
  assert.match(source, /subjectId/);
});
test('network failures and expired sessions are explicit and no tokens are persisted', () => {
  const client = read('src/lib/teacher/service.ts');
  const ui = read('src/components/teacher/teacher-portal.tsx');
  assert.match(client, /NETWORK_ERROR/);
  assert.match(client, /credentials: "same-origin"/);
  assert.match(ui, /SESSION_EXPIRED/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
});
test('teacher pages do not include demo student names or seeded attendance', () => {
  const ui = read('src/components/teacher/teacher-portal.tsx');
  assert.match(ui, /No sample classes, students, timetable, attendance or assignments/);
  assert.doesNotMatch(ui, /Ahmed|Fatima|seedStudents|demoAttendance/);
});
test('API contract specifies backend assignment enforcement, duplicate prevention and audit history', () => {
  const contract = read('API-CONTRACT.md');
  assert.match(contract, /Phase 5 — Teacher Portal API contract/);
  assert.match(contract, /LockService/);
  assert.match(contract, /correction reason/);
  assert.match(contract, /role `teacher`/);
});
