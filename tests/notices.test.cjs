const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('src/lib/notices/contracts.ts');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const box = { exports: {} };
new Function('module', 'exports', compiled)(box, box.exports);
const n = box.exports;
const now = new Date('2026-10-14T12:00:00.000Z');
const base = { id:'n1', title:'School holiday', body:'School will be closed on the approved date.', category:'General', audience:'public', status:'published', published:true, publicApproved:true, publishedAt:'2026-10-13T09:00:00.000Z', expiresAt:'2026-10-20' };

test('notice draft validates required fields, limits and supported audience', () => {
  assert.match(n.validateNoticeDraft({ title:' ', body:'valid body', category:'General', audience:'public' }, now), /title/i);
  assert.match(n.validateNoticeDraft({ title:'a'.repeat(161), body:'valid body', category:'General', audience:'public' }, now), /title/i);
  assert.match(n.validateNoticeDraft({ title:'Notice', body:'', category:'General', audience:'public' }, now), /content/i);
  assert.match(n.validateNoticeDraft({ title:'Notice', body:'body', category:'General', audience:'unknown' }, now), /audience/i);
  assert.equal(n.validateNoticeDraft({ title:'Notice', body:'Valid school update.', category:'General', audience:'teachers' }, now), null);
});
test('notice expiry requires real calendar date and cannot be in the past', () => {
  assert.match(n.validateNoticeDraft({ title:'Notice', body:'Body', category:'General', audience:'students', expiresAt:'2026-02-30' }, now), /valid expiry/i);
  assert.match(n.validateNoticeDraft({ title:'Notice', body:'Body', category:'General', audience:'students', expiresAt:'2026-10-13' }, now), /past/i);
  assert.equal(n.validateNoticeDraft({ title:'Notice', body:'Body', category:'General', audience:'students', expiresAt:'2026-10-15' }, now), null);
});
test('public notices are checked for obvious private student or family information', () => {
  assert.match(n.validateNoticeDraft({ title:'Student notice', body:'GR No 12345 must report to the office', category:'General', audience:'public' }, now), /private/i);
  assert.equal(n.validateNoticeDraft({ title:'Holiday notice', body:'School will be closed tomorrow.', category:'General', audience:'public' }, now), null);
});
test('class-targeted notices require at least one class or section ID', () => {
  assert.match(n.validateNoticeDraft({ title:'Class notice', body:'Bring notebooks.', category:'Academic', audience:'classes' }, now), /class or section/i);
  assert.equal(n.validateNoticeDraft({ title:'Class notice', body:'Bring notebooks.', category:'Academic', audience:'classes', sectionIds:['section-a'] }, now), null);
  assert.deepEqual(n.uniqueNoticeIds([' class-a ', '', 'class-a', 'section-a']), ['class-a','section-a']);
});
test('public visitors see only explicitly approved public published notices', () => {
  assert.equal(n.publicNoticeVisible(base, now), true);
  assert.equal(n.publicNoticeVisible({...base, publicApproved:false}, now), false);
  assert.equal(n.publicNoticeVisible({...base, audience:'classes'}, now), false);
  assert.equal(n.publicNoticeVisible({...base, status:'draft', published:false}, now), false);
  assert.equal(n.publicNoticeVisible({...base, status:'archived'}, now), false);
});
test('future publication and expired notices are excluded', () => {
  assert.equal(n.publicNoticeVisible({...base, publishedAt:'2026-10-15T09:00:00.000Z'}, now), false);
  assert.equal(n.publicNoticeVisible({...base, expiresAt:'2026-10-13'}, now), false);
  assert.equal(n.publicNoticeVisible({...base, expiresAt:'not-a-date'}, now), false);
  assert.equal(n.isScheduledForFuture({...base, scheduledAt:'2026-10-15T09:00:00.000Z'}, now), true);
  assert.equal(n.isScheduledForFuture({...base, scheduledAt:'invalid'}, now), false);
});
test('teachers see teacher/public notices and only assigned class/section notices', () => {
  const teacher = {...base, audience:'teachers'};
  const classNotice = {...base, audience:'classes', classIds:['class-1'], sectionIds:['section-a']};
  assert.equal(n.teacherNoticeVisible(teacher, {}, now), true);
  assert.equal(n.teacherNoticeVisible(base, {}, now), true);
  assert.equal(n.teacherNoticeVisible(classNotice, {classIds:['class-2'],sectionIds:[]}, now), false);
  assert.equal(n.teacherNoticeVisible(classNotice, {classIds:['class-1'],sectionIds:[]}, now), false);
  assert.equal(n.teacherNoticeVisible(classNotice, {classIds:['class-1'],sectionIds:['section-a']}, now), true);
  assert.equal(n.teacherNoticeVisible({...base,audience:'admins'}, {classIds:['class-1']}, now), false);
});
test('students see student-wide/public notices and only matching class and section notices', () => {
  assert.equal(n.studentNoticeVisible({...base,audience:'students'}, {}, now), true);
  assert.equal(n.studentNoticeVisible(base, {}, now), true);
  const targeted = {...base, audience:'classes', classIds:['class-2'], sectionIds:['section-b']};
  assert.equal(n.studentNoticeVisible(targeted, {classId:'class-1',sectionId:'section-b'}, now), false);
  assert.equal(n.studentNoticeVisible(targeted, {classId:'class-2',sectionId:'section-a'}, now), false);
  assert.equal(n.studentNoticeVisible(targeted, {classId:'class-2',sectionId:'section-b'}, now), true);
  assert.equal(n.studentNoticeVisible({...targeted,classIds:[]}, {sectionId:'section-b'}, now), true);
  assert.equal(n.studentNoticeVisible({...base,audience:'admins'}, {classId:'class-2'}, now), false);
});
test('notice operation keys are deterministic for idempotent status changes', () => {
  assert.equal(n.noticeOperationKey(' n1 ', ' publish ', 3), 'n1:publish:3');
});
test('Admin notice UI is integrated and never reports unacknowledged writes as successful', () => {
  const admin = read('src/components/admin/admin-console.tsx');
  const ui = read('src/components/admin/notice-management.tsx');
  assert.match(admin, /NoticeManagement/);
  assert.match(ui, /await adminRequest/);
  assert.match(ui, /expectedVersion/);
  assert.match(ui, /window\.confirm/);
  assert.match(ui, /Draft was saved, but scheduled publication was not confirmed/);
  assert.match(ui, /attachments are not uploaded here/i);
});
test('teacher and student notice views use audience filters and localized RTL layouts', () => {
  assert.match(read('src/components/teacher/teacher-portal.tsx'), /NoticeFeed items=.*scope="teacher"/);
  assert.match(read('src/components/student/student-portal.tsx'), /studentNoticeVisible/);
  const feed = read('src/components/notices/notice-feed.tsx');
  assert.match(feed, /scope === "public" \? publicNoticeVisible/);
  assert.match(feed, /dir=\{locale === "en" \? "ltr" : "rtl"\}/);
  assert.match(feed, /ur:/);
  assert.match(feed, /sd:/);
});
test('public route uses the public API and the API fails closed without configured backend', () => {
  assert.match(read('src/components/notice-list.tsx'), /fetch\("\/api\/notices"/);
  assert.match(read('src/app/api/notices/route.ts'), /NOT_CONFIGURED/);
  assert.match(read('src/app/api/admin/[...operation]/route.ts'), /NOT_CONFIGURED/);
  assert.match(read('API-CONTRACT.md'), /Phase 12 — Notices and communication/);
  assert.match(read('README.md'), /Phase 12 — School notices and communication/);
});
test('notice records are schema-checked and unknown statuses/audiences are rejected', () => {
  assert.equal(n.isNoticeRecord(base), true);
  assert.equal(n.isNoticeRecord({...base, audience:'everyone'}), false);
  assert.equal(n.isNoticeRecord({...base, status:'pending'}), false);
  assert.equal(n.isNoticeRecord({id:'', title:'t', body:'b', audience:'public', status:'published'}), false);
});

test('backend contract requires trusted audience/class validation and secure attachment authorization', () => {
  const docs = read('API-CONTRACT.md');
  assert.match(docs, /class\/section lookup against trusted records/i);
  assert.match(docs, /authorized attachment endpoints must stream or mint short-lived downloads/i);
  assert.match(docs, /Never accept arbitrary attachment URLs/i);
  assert.match(docs, /unique .*noticeId, version, channel, recipient/i);
});
test('public notice network failures and empty datasets do not create sample notices', () => {
  const page = read('src/components/notice-list.tsx');
  assert.match(page, /catch \{ setItems\(\[\]\); setUnavailable\(true\); \}/);
  assert.match(page, /No sample or private notices are shown/);
  assert.match(read('src/components/notices/notice-feed.tsx'), /No applicable published notices/);
});
