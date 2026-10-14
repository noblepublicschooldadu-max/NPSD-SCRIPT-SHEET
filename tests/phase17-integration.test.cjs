const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('all role-specific APIs fail closed while trusted auth/backend are absent', () => {
  for (const route of [
    'src/app/api/admin/[...operation]/route.ts',
    'src/app/api/teacher/[...operation]/route.ts',
    'src/app/api/student/[...operation]/route.ts',
    'src/app/api/admin/backups/route.ts',
  ]) {
    const source = read(route);
    assert.match(source, /503|NOT_CONFIGURED/);
    assert.doesNotMatch(source, /NextResponse\.json\(\s*\{\s*(students|records|results|backups)\s*:/);
  }
});

test('public write endpoints do not claim persistence without backend configuration', () => {
  for (const route of [
    'src/app/api/admissions/route.ts',
    'src/app/api/registration-requests/route.ts',
    'src/app/api/auth/login/route.ts',
    'src/app/api/auth/recovery-requests/route.ts',
  ]) {
    const source = read(route);
    assert.match(source, /NOT_CONFIGURED/);
    assert.match(source, /503/);
  }
});

test('integration report accurately records missing GAS source and blocked workflows', () => {
  const report = read('docs/INTEGRATION_TEST_REPORT.md');
  assert.match(report, /Final readiness status: NOT READY/);
  assert.match(report, /Workflow\s*\|\s*Result/);
  assert.match(report, /Apps Script source\/deployment/);
  assert.match(report, /No workflow is labelled passed end-to-end/);
});

test('pilot checklist blocks real-data import until approval and restore verification', () => {
  const checklist = read('docs/SCHOOL_PILOT_CHECKLIST.md');
  assert.match(checklist, /Use synthetic records only/);
  assert.match(checklist, /Isolated restore drill passed/);
  assert.match(checklist, /Current project state:\*\* NO-GO/);
});

test('no Apps Script or lockfile is fabricated to imply a live integration', () => {
  assert.equal(fs.existsSync(path.join(root, 'package-lock.json')), false);
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(path.relative(root, full));
    }
  };
  walk(root);
  assert.equal(files.some(file => file.endsWith('.gs') || file === 'appsscript.json'), false);
});
