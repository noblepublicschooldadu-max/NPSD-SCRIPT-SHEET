const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function loadTs(relative, dependencies = {}) {
  const file = path.join(root, relative);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => { if (dependencies[id]) return dependencies[id]; throw new Error(`Unexpected dependency: ${id}`); };
  vm.runInNewContext(`(function(require,module,exports){${js}\n})`, { console, Response, Request, URL, Headers, JSON, Object, String, Number, RegExp, Error, Promise, fetch: (...args) => global.fetch(...args) }).call(null, localRequire, module, module.exports);
  return module.exports;
}
const contracts = loadTs('src/lib/student/contracts.ts');

test('all nine requested student routes resolve through the shared portal', () => {
  assert.ok(fs.existsSync(path.join(root, 'src/app/student/[[...section]]/page.tsx')));
  for (const slug of ['', 'profile', 'attendance', 'id-card', 'homework', 'timetable', 'results', 'notices', 'settings']) assert.ok(read('src/lib/student/contracts.ts').includes(`slug: "${slug}"`));
});
test('student API fails closed without session verifier and trusted Apps Script channel', () => {
  const route = read('src/app/api/student/[...operation]/route.ts');
  assert.match(route, /NOT_CONFIGURED/);
  assert.match(route, /Do not accept student IDs, role headers, or identity assertions/);
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) assert.match(route, new RegExp(`function ${method}`));
});
test('student API route returns no student data while unconfigured', async () => {
  const http = loadTs('src/lib/api/http.ts', { '@/lib/auth/contracts': {} });
  const route = loadTs('src/app/api/student/[...operation]/route.ts', { '@/lib/api/http': http });
  const response = await route.GET(new Request('http://localhost/api/student/profile'));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'NOT_CONFIGURED');
  assert.equal(body.data, undefined);
});
test('attendance summary counts only valid statuses and leaves missing records unmarked', () => {
  const result = contracts.summarizeAttendance([
    { date: '2026-10-01', status: 'present' },
    { date: '2026-10-02', status: 'absent' },
    { date: '2026-10-03', status: 'unmarked' },
    { date: '', status: 'absent' },
    { date: '2026-10-04', status: 'unknown' },
  ]);
  assert.equal(result.present, 1);
  assert.equal(result.absent, 1);
  assert.equal(result.recorded, 2);
  assert.equal(result.unmarked, 2);
  assert.equal(result.total, 4);
});
test('ID card requires approved verified record and complete official fields; QR remains disabled', () => {
  const base = { name: 'Verified Student', officialIdentifier: 'GR-100', className: '4', section: 'A', academicYear: '2026', schoolName: 'School', approved: true, officialRecordVerified: true };
  assert.equal(contracts.canRenderStudentIdCard(base), true);
  assert.equal(contracts.canRenderStudentIdCard({ ...base, approved: false }), false);
  assert.equal(contracts.canRenderStudentIdCard({ ...base, officialIdentifier: '' }), false);
  const ui = read('src/components/student/student-portal.tsx');
  assert.match(ui, /QR verification is disabled/);
  assert.match(ui, /No personal details are encoded in a QR code/);
  assert.match(ui, /window\.print\(\)/);
  assert.doesNotMatch(ui, /QRCode|qrcode|qr-code/);
});
test('unpublished results are filtered and empty API responses show honest empty states', () => {
  const ui = read('src/components/student/student-portal.tsx');
  assert.match(ui, /publishedResultVisible/);
  assert.match(ui, /No sample student profile, attendance, assignments, timetable, marks or notices/);
  assert.match(ui, /No attendance entries match this filter/);
});
test('client uses same-origin no-store requests and never persists student data or tokens', () => {
  const client = read('src/lib/student/service.ts');
  assert.match(client, /credentials: "same-origin"/);
  assert.match(client, /cache: "no-store"/);
  assert.match(client, /NETWORK_ERROR/);
  assert.match(read('src/components/student/student-portal.tsx'), /SESSION_EXPIRED/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
});
test('profile is read-only and unavailable corrections direct students to school admin', () => {
  const ui = read('src/components/student/student-portal.tsx');
  assert.match(ui, /To correct official information, please contact the school administrator/);
  assert.doesNotMatch(ui, /setProfile|updateProfile|PATCH.*profile/);
});
test('student API contract specifies session-derived identity, published results and QR token security', () => {
  const contract = read('API-CONTRACT.md');
  assert.match(contract, /Phase 6 — Student Portal API contract/);
  assert.match(contract, /derive student identity from that session/);
  assert.match(contract, /whose server-side publication state is explicitly published/);
  assert.match(contract, /opaque, high-entropy token/);
});
test('English, Urdu and Sindhi navigation labels and RTL locale support exist', () => {
  const ui = read('src/components/student/student-portal.tsx');
  assert.match(ui, /ur: \{ nav:/);
  assert.match(ui, /sd: \{ nav:/);
  assert.match(ui, /locale === "en" \? "ltr" : "rtl"/);
  assert.match(ui, /LanguageSwitcher/);
});

test('network failure is surfaced as a recoverable error without a false success', async () => {
  const service = loadTs('src/lib/student/service.ts');
  const original = global.fetch;
  global.fetch = async () => { throw new Error('offline'); };
  try {
    await assert.rejects(service.studentRequest('profile'), (error) => error.code === 'NETWORK_ERROR' && error.status === 0 && /not loaded/.test(error.message));
  } finally { global.fetch = original; }
});
test('expired session and empty responses are treated as errors, not student records', async () => {
  const service = loadTs('src/lib/student/service.ts');
  const original = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ ok: false, error: { code: 'SESSION_EXPIRED', message: 'Please sign in again.' } }), { status: 401, headers: { 'content-type': 'application/json' } });
  try { await assert.rejects(service.studentRequest('profile'), (error) => error.code === 'SESSION_EXPIRED' && error.status === 401); }
  finally { global.fetch = original; }
  global.fetch = async () => new Response('', { status: 200 });
  try { await assert.rejects(service.studentRequest('profile'), (error) => error.code === 'INVALID_RESPONSE'); }
  finally { global.fetch = original; }
});
