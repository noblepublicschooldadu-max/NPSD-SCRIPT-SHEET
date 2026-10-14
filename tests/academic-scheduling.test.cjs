const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('src/lib/academics/contracts.ts');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleBox = { exports: {} };
new Function('module', 'exports', compiled)(moduleBox, moduleBox.exports);
const c = moduleBox.exports;

test('academic year validation rejects invalid dates, reversed ranges and duplicate names', () => {
  assert.match(c.validateAcademicYear({name:'',startDate:'2026-01-01',endDate:'2026-12-31'}, []), /name/i);
  assert.match(c.validateAcademicYear({name:'2026-27',startDate:'2026-02-30',endDate:'2027-01-01'}, []), /valid/i);
  assert.match(c.validateAcademicYear({name:'2026-27',startDate:'2027-01-01',endDate:'2026-12-31'}, []), /on or after/i);
  assert.match(c.validateAcademicYear({name:'2026-27',startDate:'2026-01-01',endDate:'2026-12-31'}, [{id:'y1',name:'2026-27',startDate:'2026-01-01',endDate:'2026-12-31',status:'active'}]), /already exists/i);
});
test('academic year validation prevents overlapping non-archived years and preserves archived history', () => {
  const existing = [{id:'old',name:'2025-26',startDate:'2025-08-01',endDate:'2026-06-30',status:'archived'}];
  assert.equal(c.validateAcademicYear({name:'2026-27',startDate:'2026-08-01',endDate:'2027-06-30'}, existing), null);
  assert.match(c.validateAcademicYear({name:'2026-27',startDate:'2026-06-30',endDate:'2027-06-30'}, [{...existing[0],status:'completed'}]), /overlaps/i);
  assert.equal(c.canArchiveYear({id:'y',name:'active',startDate:'2026-01-01',endDate:'2026-12-31',status:'active'}), false);
  assert.equal(c.canArchiveYear({id:'y2',name:'upcoming',startDate:'2027-01-01',endDate:'2027-12-31',status:'upcoming'}), false);
});
test('class catalogue is limited to levels 1–8 and duplicate class levels are detectable', () => {
  assert.equal(c.validateClassLevel(1), null);
  assert.equal(c.validateClassLevel(8), null);
  assert.match(c.validateClassLevel(0), /1–8/);
  assert.match(c.validateClassLevel(9), /1–8/);
  assert.equal(c.hasDuplicateClassLevel({level:4,academicYearId:'y1'},[{id:'c4',level:4,academicYearId:'y1'}]), true);
  assert.equal(c.hasDuplicateClassLevel({level:4,academicYearId:'y2'},[{id:'c4',level:4,academicYearId:'y1'}]), false);
});
test('section names and duplicate sections are validated per class and academic year', () => {
  assert.match(c.validateSectionName('  '), /section name/i);
  assert.equal(c.validateSectionName('Blue'), null);
  const existing = [{id:'s1',classId:'c1',academicYearId:'y1',name:'A'}];
  assert.equal(c.hasDuplicateSection({classId:'c1',academicYearId:'y1',name:'a'}, existing), true);
  assert.equal(c.hasDuplicateSection({classId:'c2',academicYearId:'y1',name:'A'}, existing), false);
});
test('timetable rejects invalid times and overlap within class/section', () => {
  const base = {id:'e1',academicYearId:'y1',classId:'c1',sectionId:'s1',day:'Monday',period:1,startTime:'08:00',endTime:'08:40',subjectId:'math',teacherId:'t1',kind:'lesson',status:'draft'};
  const assignments = [{classId:'c1',academicYearId:'y1',subjectId:'math',teacherId:'t1'}];
  assert.match(c.validateTimetableEntry({...base,startTime:'09:00',endTime:'08:00'}, [], assignments), /after/i);
  assert.match(c.validateTimetableEntry({...base,id:undefined,period:2,startTime:'08:20',endTime:'09:00'}, [base], assignments), /overlaps/i);
  assert.equal(c.validateTimetableEntry({...base,id:undefined,period:2,startTime:'08:40',endTime:'09:20'}, [base], assignments), null);
});
test('timetable rejects teacher conflicts and invalid subject/teacher assignments', () => {
  const base = {id:'e1',academicYearId:'y1',classId:'c1',sectionId:'s1',day:'Monday',period:1,startTime:'08:00',endTime:'08:40',subjectId:'math',teacherId:'t1',kind:'lesson',status:'draft'};
  const other = {...base,id:'e2',classId:'c2',sectionId:'s2',subjectId:'english'};
  const assignments = [{classId:'c1',academicYearId:'y1',subjectId:'math',teacherId:'t1'},{classId:'c2',academicYearId:'y1',subjectId:'english',teacherId:'t1'}];
  assert.match(c.validateTimetableEntry({...base,id:undefined}, [other], assignments), /teacher is already scheduled/i);
  assert.match(c.validateTimetableEntry({...base,id:undefined,teacherId:'t2'}, [], assignments), /not assigned/i);
});
test('teacher and student timetable filters exclude drafts and unrelated records', () => {
  const entries = [
    {id:'a',status:'published',kind:'lesson',teacherId:'t1',classId:'c1',sectionId:'s1',academicYearId:'y1'},
    {id:'b',status:'draft',kind:'lesson',teacherId:'t1',classId:'c1',sectionId:'s1',academicYearId:'y1'},
    {id:'c',status:'published',kind:'lesson',teacherId:'t2',classId:'c2',sectionId:'s2',academicYearId:'y1'},
  ];
  assert.deepEqual(c.teacherVisibleEntries(entries,'t1').map(x=>x.id), ['a']);
  assert.deepEqual(c.teacherVisibleEntries(entries,'').map(x=>x.id), []);
  assert.deepEqual(c.studentVisibleEntries(entries,'c1','s1','y1').map(x=>x.id), ['a']);
  assert.deepEqual(c.studentVisibleEntries(entries,'','','y1'), []);
});
test('new routes and fail-closed API contracts are documented and wired', () => {
  const admin = read('src/lib/admin/contracts.ts');
  const teacher = read('src/lib/teacher/contracts.ts');
  const student = read('src/lib/student/contracts.ts');
  const api = read('src/app/api/admin/[...operation]/route.ts') + read('src/app/api/teacher/[...operation]/route.ts') + read('src/app/api/student/[...operation]/route.ts');
  for (const slug of ['classes','timetable','academic-years']) assert.ok(admin.includes(`slug:"${slug}"`));
  assert.match(teacher,/slug: "timetable"/);
  assert.match(student,/timetable: "timetable"/);
  assert.match(api,/NOT_CONFIGURED/);
  assert.match(read('API-CONTRACT.md'),/Phase 11 — Timetable/);
  assert.match(read('src/components/admin/academic-scheduling-management.tsx'),/expectedVersion/);
});
test('promotion remains review-only and no automatic promotion is implemented', () => {
  const ui = read('src/components/admin/academic-scheduling-management.tsx');
  const docs = read('API-CONTRACT.md') + read('README.md');
  assert.match(ui,/Promotion policy is not confirmed/);
  assert.match(docs,/no automatic promotion/i);
  assert.doesNotMatch(ui,/year-transitions\/[^"`]*approve/);
});
test('school timetable hours, days, period length and breaks are configurable, not seeded', () => {
  const ui = read('src/components/admin/academic-scheduling-management.tsx');
  assert.match(ui,/Configure school hours and breaks/);
  assert.match(ui,/settingsDays/);
  assert.match(ui,/settingsPeriodMinutes/);
  assert.match(ui,/settingsBreaks/);
  assert.match(ui,/timetable\/settings/);
  assert.doesNotMatch(ui,/setSettingsDays\(\["Monday"/);
});
test('year switching and archival require explicit confirmation and record versions', () => {
  const ui = read('src/components/admin/academic-scheduling-management.tsx');
  assert.match(ui,/Make \$\{y\.name\} the active academic year/);
  assert.match(ui,/expectedVersion:y\.version/);
  assert.match(ui,/Archive \$\{y\.name\}/);
  assert.match(read('API-CONTRACT.md'),/activatedBy/);
  assert.match(read('API-CONTRACT.md'),/activatedAt/);
});
test('archival contract preserves records and never uses a deletion endpoint', () => {
  const ui = read('src/components/admin/academic-scheduling-management.tsx');
  const docs = read('API-CONTRACT.md');
  assert.match(ui,/Historical attendance, homework, examinations and results must remain available/);
  assert.match(ui,/archive/);
  assert.doesNotMatch(ui,/classes\/sections\/\$\{[^}]+\}\/delete/);
  assert.match(docs,/Archival is a status transition; never cascade-delete historical records/);
});
test('stale timetable records without versions cannot be edited, published or archived', () => {
  const ui = read('src/components/admin/academic-scheduling-management.tsx');
  assert.match(ui,/disabled=\{busy\|\|!e\.id\|\|typeof e\.version!=="number"\}/);
  assert.match(ui,/expectedVersion:editingId\?entries\.find/);
});

test('unauthorized academic-year changes remain blocked until the protected API is implemented', () => {
  const api = read('src/app/api/admin/[...operation]/route.ts');
  const ui = read('src/components/admin/academic-scheduling-management.tsx');
  assert.match(api,/NOT_CONFIGURED/);
  assert.match(api,/Do not trust role headers/);
  assert.match(ui,/Make \${y\.name} the active academic year/);
  assert.match(ui,/window\.confirm/);
});
test('promotion review keys are stable per student and transition', () => {
  assert.equal(c.promotionOperationKey('year-2026','student-1'), 'year-2026:student-1');
  assert.equal(c.promotionOperationKey(' year-2026 ',' student-1 '), 'year-2026:student-1');
});
