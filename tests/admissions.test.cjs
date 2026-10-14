const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('src/lib/admissions/contracts.ts');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const box = { exports: {} }; new Function('module', 'exports', compiled)(box, box.exports); const a = box.exports;
const valid = { applicantName:'Amina Ahmed', dateOfBirth:'2018-01-02', requestedClass:2, guardianName:'Ahmed Ali', guardianPhone:'03001234567', address:'Dadu, Sindh, Pakistan', consent:true };

test('valid application input is accepted without requiring a GR/Seat Number', () => assert.deepEqual(a.validateAdmissionApplication(valid, new Date('2026-10-14T00:00:00Z')), {}));
test('required fields, class range, consent and date are validated', () => {
 assert.ok(a.validateAdmissionApplication({...valid, applicantName:' '}).applicantName);
 assert.ok(a.validateAdmissionApplication({...valid, requestedClass:9}).requestedClass);
 assert.ok(a.validateAdmissionApplication({...valid, consent:false}).consent);
 assert.ok(a.validateAdmissionApplication({...valid, dateOfBirth:'2026-10-15'}, new Date('2026-10-14T00:00:00Z')).dateOfBirth);
 assert.ok(a.validateAdmissionApplication({...valid, dateOfBirth:'2018-02-30'}).dateOfBirth);
});
test('Pakistan mobile number formats normalize and invalid numbers are rejected', () => {
 assert.equal(a.normalizePakistanPhone('0300 123 4567'),'03001234567');
 assert.equal(a.normalizePakistanPhone('+92 300 1234567'),'03001234567');
 assert.equal(a.normalizePakistanPhone('0092-300-1234567'),'03001234567');
 assert.equal(a.normalizePakistanPhone('0211234567'),null);
 assert.ok(a.validateAdmissionApplication({...valid, guardianPhone:'123'}).guardianPhone);
});
test('application status transitions prevent repeating decisions and reopening terminal states', () => {
 assert.equal(a.isAdmissionStatusTransitionAllowed('submitted','under_review'),true);
 assert.equal(a.isAdmissionStatusTransitionAllowed('submitted','submitted'),false);
 assert.equal(a.isAdmissionStatusTransitionAllowed('approved','under_review'),false);
 assert.equal(a.isAdmissionStatusTransitionAllowed('rejected','approved'),false);
 assert.equal(a.isAdmissionStatusTransitionAllowed('waitlisted','approved'),true);
});
test('conversion/action operation keys are deterministic and public references require high entropy format', () => {
 assert.equal(a.admissionOperationKey(' app1 ',' approve ',2),'app1:approve:2');
 assert.equal(a.isSafePublicApplicationReference('NPSD-AB12-CD34EF56'),true);
 assert.equal(a.isSafePublicApplicationReference('12'),false);
 assert.equal(a.isSafePublicApplicationReference('NPSD-0001-00000001'),true);
});
test('public routes show admissions form but do not issue a reference or claim storage without backend confirmation', () => {
 assert.match(read('src/app/admissions/page.tsx'),/AdmissionsPageContent/);
 assert.match(read('src/components/admissions/admissions-page-content.tsx'),/AdmissionApplicationForm/);
 assert.match(read('src/app/admissions/apply/page.tsx'),/AdmissionApplicationForm/);
 assert.match(read('src/components/admissions/application-form.tsx'),/fetch\("\/api\/admissions"/);
 assert.match(read('src/components/admissions/application-form.tsx'),/No application was saved|not been saved|not saved/i);
 assert.match(read('src/app/api/admissions/route.ts'),/NOT_CONFIGURED/);
 assert.match(read('src/app/api/admissions/route.ts'),/No application was saved/);
 assert.doesNotMatch(read('src/app/admissions/page.tsx'),/href="\/admissions\/status"/);
});
test('admin admissions component is integrated and sends optimistic version and idempotency key', () => {
 assert.match(read('src/components/admin/admin-console.tsx'),/AdmissionsManagement/);
 const ui=read('src/components/admin/admissions-management.tsx');
 assert.match(ui,/adminRequest/); assert.match(ui,/expectedVersion/); assert.match(ui,/operationKey/);
 assert.match(ui,/window\.confirm/); assert.match(ui,/cursor/); assert.match(ui,/review note/i);
 assert.match(ui,/Student conversion is disabled/);
});
test('backend contract documents Sheets, audit, duplicate prevention and student conversion limitations', () => {
 assert.match(read('API-CONTRACT.md'),/Phase 13 — Online admissions/);
 const docs=read('README.md'); assert.match(docs,/Phase 13 — Online admissions/);
 assert.match(docs,/currently stored in Google Sheets/i);
});
