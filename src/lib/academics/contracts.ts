export type AcademicYearRecord = { id: string; name: string; startDate: string; endDate: string; status: "upcoming" | "active" | "completed" | "archived"; version?: number };
export type TimetableEntry = { id?: string; academicYearId: string; classId: string; sectionId: string; day: string; period: number; startTime: string; endTime: string; subjectId?: string; subjectName?: string; teacherId?: string; teacherName?: string; room?: string; kind: "lesson" | "break" | "non_teaching"; status?: "draft" | "published" | "archived"; version?: number };
export type AssignmentRef = { classId: string; academicYearId: string; subjectId?: string; teacherId?: string };
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function validIsoDate(value: string): boolean { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const d = new Date(`${value}T12:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value; }
export function validateAcademicYear(input: { name: string; startDate: string; endDate: string }, existing: AcademicYearRecord[], excludeId?: string, allowOverlap = false): string | null {
  const name = input.name.trim();
  if (!name) return "Enter an academic-year name.";
  if (!validIsoDate(input.startDate) || !validIsoDate(input.endDate)) return "Enter valid start and end dates.";
  if (input.endDate < input.startDate) return "The end date must be on or after the start date.";
  if (existing.some(y => y.id !== excludeId && y.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) return "An academic year with this name already exists.";
  if (!allowOverlap && existing.some(y => y.id !== excludeId && y.status !== "archived" && input.startDate <= y.endDate && input.endDate >= y.startDate)) return "This date range overlaps another non-archived academic year. Confirm the school's year-overlap policy before proceeding.";
  return null;
}
export function validateClassLevel(level: unknown): string | null { if (!Number.isInteger(level) || Number(level) < 1 || Number(level) > 8) return "Class level must be one of the school's classes 1–8."; return null; }
export function hasDuplicateClassLevel<T extends { id?: string; level: number; academicYearId?: string }>(candidate: { level: number; academicYearId?: string }, classes: T[], excludeId?: string): boolean { return classes.some(c => c.id !== excludeId && c.level === candidate.level && (c.academicYearId ?? "") === (candidate.academicYearId ?? "")); }
export function validateSectionName(name: string): string | null { const value = name.trim(); if (!value) return "Enter a section name."; if (value.length > 40) return "Section name must be 40 characters or fewer."; if (/[<>\u0000-\u001f]/.test(value)) return "Section name contains unsupported characters."; return null; }
export function hasDuplicateSection<T extends { id?: string; classId: string; academicYearId: string; name: string }>(candidate: { classId: string; academicYearId: string; name: string }, sections: T[], excludeId?: string): boolean { return sections.some(s => s.id !== excludeId && s.classId === candidate.classId && s.academicYearId === candidate.academicYearId && s.name.trim().toLocaleLowerCase() === candidate.name.trim().toLocaleLowerCase()); }
export function minuteOfDay(value: string): number | null { if (!TIME.test(value)) return null; const [h,m] = value.split(":").map(Number); return h * 60 + m; }
export function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean { const as=minuteOfDay(aStart), ae=minuteOfDay(aEnd), bs=minuteOfDay(bStart), be=minuteOfDay(bEnd); return as !== null && ae !== null && bs !== null && be !== null && as < be && bs < ae; }
export function validateTimetableEntry(entry: TimetableEntry, entries: TimetableEntry[], assignments: AssignmentRef[], excludeId?: string): string | null {
  if (!entry.academicYearId || !entry.classId || !entry.sectionId) return "Select an academic year, class and section.";
  if (!entry.day.trim()) return "Select a teaching day.";
  if (!Number.isInteger(entry.period) || entry.period < 1 || entry.period > 20) return "Period number must be between 1 and 20.";
  const start=minuteOfDay(entry.startTime), end=minuteOfDay(entry.endTime);
  if (start === null || end === null) return "Enter valid 24-hour start and end times.";
  if (end <= start) return "The end time must be after the start time.";
  if (entry.kind === "lesson" && (!entry.subjectId || !entry.teacherId)) return "Select an assigned subject and teacher for a lesson period.";
  if (entry.kind === "lesson" && !assignments.some(a => a.classId === entry.classId && a.academicYearId === entry.academicYearId && a.subjectId === entry.subjectId && a.teacherId === entry.teacherId)) return "This subject and teacher are not assigned to the selected class and academic year.";
  for (const other of entries) {
    if (other.id && other.id === excludeId) continue;
    if (other.status === "archived" || other.academicYearId !== entry.academicYearId || other.day !== entry.day || !intervalsOverlap(entry.startTime, entry.endTime, other.startTime, other.endTime)) continue;
    if (other.classId === entry.classId && other.sectionId === entry.sectionId) return "This period overlaps another entry for the same class and section.";
    if (entry.kind === "lesson" && other.kind === "lesson" && entry.teacherId && other.teacherId === entry.teacherId) return "This teacher is already scheduled in another class during this time.";
  }
  return null;
}
export function teacherVisibleEntries(entries: TimetableEntry[], authenticatedTeacherId: string): TimetableEntry[] { if (!authenticatedTeacherId.trim()) return []; return entries.filter(entry => entry.status === "published" && entry.kind === "lesson" && entry.teacherId === authenticatedTeacherId); }
export function studentVisibleEntries(entries: TimetableEntry[], verifiedClassId: string, verifiedSectionId: string, verifiedAcademicYearId: string): TimetableEntry[] { if (!verifiedClassId || !verifiedSectionId || !verifiedAcademicYearId) return []; return entries.filter(entry => entry.status === "published" && entry.classId === verifiedClassId && entry.sectionId === verifiedSectionId && entry.academicYearId === verifiedAcademicYearId); }
export function canArchiveYear(year: AcademicYearRecord): boolean { return year.status === "completed"; }
export function promotionOperationKey(academicYearId: string, studentId: string): string { return `${academicYearId.trim()}:${studentId.trim()}`; }
