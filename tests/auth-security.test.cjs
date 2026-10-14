const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loadTs(relative, dependencies = {}) {
  const file = path.join(root, relative);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (dependencies[id]) return dependencies[id];
    throw new Error(`Unexpected test dependency: ${id}`);
  };
  vm.runInNewContext(`(function(require,module,exports){${js}\n})`, { console, Response, Request, URL, Headers, JSON, Object, String, Number, RegExp, Error, Promise, Set, Array, Uint8Array, TextDecoder, setTimeout, clearTimeout })(localRequire, module, module.exports);
  return module.exports;
}
const common = loadTs('src/lib/validation/common.ts');
const validation = loadTs('src/lib/validation/auth.ts', { './common': common });

test('invalid login fields are rejected', () => {
  const result = validation.validateLogin({ identifier: ' ', password: 'short' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.identifier);
  assert.ok(result.errors.password);
});

test('registration rejects invalid class and malformed guardian contact', () => {
  const result = validation.validateRegistration({ studentName: 'Student Example', classLevel: '99', guardianName: 'Guardian Example', guardianContact: 'not-a-phone' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.classLevel);
  assert.ok(result.errors.guardianContact);
});

test('registration normalizes values and accepts only a supported class', () => {
  const result = validation.validateRegistration({ studentName: '  Student   Example ', classLevel: '4', guardianName: ' Parent Example ', guardianContact: '+92 300 1234567', guardianEmail: 'PARENT@example.com' });
  assert.equal(result.ok, true);
  assert.equal(result.value.studentName, 'Student Example');
  assert.equal(result.value.guardianEmail, 'parent@example.com');
});

test('registration API validates then fails closed without issuing a reference', async () => {
  const http = loadTs('src/lib/api/http.ts', { '@/lib/auth/contracts': {} });
  const validator = { validateRegistration: validation.validateRegistration };
  const route = loadTs('src/app/api/registration-requests/route.ts', { '@/lib/api/http': http, '@/lib/validation/auth': validator });
  const invalid = await route.POST(new Request('http://localhost/api/registration-requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ studentName: 'X', classLevel: '99', guardianName: 'Y', guardianContact: 'no' }) }));
  assert.equal(invalid.status, 400);
  const valid = await route.POST(new Request('http://localhost/api/registration-requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ studentName: 'Student Example', classLevel: '2', guardianName: 'Guardian Example', guardianContact: '+923001234567' }) }));
  assert.equal(valid.status, 503);
  const body = await valid.json();
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'NOT_CONFIGURED');
  assert.equal(body.data, undefined);
});

test('pending registrations cannot get portal access because all role portals fail closed', () => {
  const singleRoute = fs.readFileSync(path.join(root, 'src/app/[section]/page.tsx'), 'utf8');
  const catchAll = fs.readFileSync(path.join(root, 'src/app/[...protectedPath]/page.tsx'), 'utf8');
  assert.match(singleRoute, /Access is denied by default/);
  assert.match(catchAll, /Access is denied by default/);
  assert.doesNotMatch(singleRoute, /localStorage.*role/i);
});

test('approval is specified as an admin-only backend operation, not a public endpoint', () => {
  const contract = fs.readFileSync(path.join(root, 'API-CONTRACT.md'), 'utf8');
  assert.match(contract, /require a live `admin` session checked server-side/);
  assert.match(contract, /pending -> approved \| rejected/);
  assert.equal(fs.existsSync(path.join(root, 'src/app/api/admin/registration-requests/route.ts')), false);
});
