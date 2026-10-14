const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }
function loadTs(relative, dependencies = {}) {
  const source = read(relative);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(dependencies, id)) return dependencies[id];
    throw new Error(`Unexpected test dependency: ${id}`);
  };
  vm.runInNewContext(`(function(require,module,exports){${js}\n})`, { console, Response, Request, URL, Headers, JSON, Object, String, Number, RegExp, Error, Promise, Set, Array, Uint8Array, TextDecoder, TypeError, SyntaxError }, { timeout: 1000 })(localRequire, module, module.exports);
  return module.exports;
}
const http = loadTs('src/lib/api/http.ts', { '@/lib/auth/contracts': {} });

test('bounded JSON parser accepts a small valid JSON request without Content-Length', async () => {
  const request = new Request('http://localhost/api/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) });
  assert.deepEqual(JSON.parse(JSON.stringify(await http.readJson(request))), { ok: true });
});

test('bounded JSON parser rejects oversized streaming bodies even when Content-Length is absent', async () => {
  const request = new Request('http://localhost/api/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 'x'.repeat(17_000) }) });
  await assert.rejects(() => http.readJson(request), /TOO_LARGE/);
});

test('bounded JSON parser rejects invalid content types and malformed JSON', async () => {
  await assert.rejects(() => http.readJson(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })), /CONTENT_TYPE/);
  await assert.rejects(() => http.readJson(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })), /INVALID_JSON/);
});

test('API responses explicitly disable browser and intermediary caching', async () => {
  const response = http.apiFailure('NOT_CONFIGURED', 'Unavailable.', 503);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});

test('login and recovery reject forged extra fields rather than accepting browser-supplied role data', async () => {
  const authValidation = loadTs('src/lib/validation/auth.ts', { './common': loadTs('src/lib/validation/common.ts') });
  const authRoute = loadTs('src/app/api/auth/login/route.ts', { '@/lib/api/http': http, '@/lib/validation/auth': authValidation });
  const recoveryRoute = loadTs('src/app/api/auth/recovery-requests/route.ts', { '@/lib/api/http': http, '@/lib/validation/auth': authValidation });
  const login = await authRoute.POST(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: 'schooluser', password: 'not-a-real-password', role: 'admin' }) }));
  assert.equal(login.status, 400);
  const recovery = await recoveryRoute.POST(new Request('http://localhost/api/auth/recovery-requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: 'schooluser', role: 'admin' }) }));
  assert.equal(recovery.status, 400);
});

test('admin, teacher, student and backup API handlers fail closed for direct requests', async () => {
  const admin = loadTs('src/app/api/admin/[...operation]/route.ts', { '@/lib/api/http': http });
  const backups = loadTs('src/app/api/admin/backups/route.ts', { '@/lib/api/http': http });
  const teacher = loadTs('src/app/api/teacher/[...operation]/route.ts', { '@/lib/api/http': http });
  const student = loadTs('src/app/api/student/[...operation]/route.ts', { '@/lib/api/http': http });
  for (const route of [admin, backups, teacher, student]) {
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = await route[method](new Request('http://localhost/api/protected', { method }));
      assert.equal(response.status, 503, `${method} should fail closed`);
      assert.equal((await response.json()).error.code, 'NOT_CONFIGURED');
    }
  }
});

test('security headers cover every route without exposing framework branding', () => {
  const config = read('next.config.ts');
  for (const header of ['X-Frame-Options', 'Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) assert.ok(config.includes(header), header);
  assert.match(config, /poweredByHeader:\s*false/);
});

test('CSV guard neutralizes formulas after leading whitespace and control characters', () => {
  const attendance = loadTs('src/lib/attendance/contracts.ts');
  for (const value of ['=1+1', '+cmd', '-1+2', '@SUM(A1)', '\tformula', '\rformula', '  =SUM(A1:A2)', '\uFEFF=1+1', '\n=1+1']) {
    assert.ok(attendance.csvSafe(value).startsWith('"\''), JSON.stringify(value));
  }
  assert.equal(attendance.csvSafe('ordinary text'), '"ordinary text"');
});

test('no Apps Script implementation, package lock, or Vercel deployment config is present in this repository snapshot', () => {
  const files = [];
  function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { if (['node_modules', '.next', '.git'].includes(item.name)) continue; const full = path.join(dir, item.name); if (item.isDirectory()) walk(full); else files.push(path.relative(root, full)); } }
  walk(root);
  assert.equal(files.some(file => /(^|\/)(Code\.gs|appsscript\.json)$/.test(file)), false);
  assert.equal(files.some(file => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(file)), false);
  assert.equal(files.includes('vercel.json'), false);
});
