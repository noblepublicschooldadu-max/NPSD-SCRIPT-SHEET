export const TEACHER_SECTIONS = [
  { slug: "", label: "Dashboard", icon: "⌂" },
  { slug: "classes", label: "My classes", icon: "▦" },
  { slug: "timetable", label: "My timetable", icon: "◷" },
  { slug: "attendance", label: "Attendance", icon: "✓" },
  { slug: "homework", label: "Homework", icon: "✎" },
  { slug: "examinations", label: "Examinations", icon: "▤" },
  { slug: "results", label: "Marks & results", icon: "▥" },
  { slug: "notices", label: "Notices", icon: "▣" },
  { slug: "profile", label: "My profile", icon: "◉" },
] as const;

export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type MarkEntry = { studentId: string; marks: number | null };

export function validateAttendanceBatch(entries: Array<{ studentId: string; status: string }>) {
  if (!Array.isArray(entries) || entries.length === 0) return "Select at least one student status before submitting.";
  const ids = entries.map((entry) => entry.studentId.trim());
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return "Student IDs must be present and unique.";
  const allowed = new Set(["present", "absent", "late", "excused"]);
  if (entries.some((entry) => !allowed.has(entry.status))) return "One or more attendance statuses are invalid.";
  return null;
}

export function validateMarks(marks: number | null, maximum: number) {
  if (!Number.isFinite(maximum) || maximum <= 0) return "The configured maximum marks are unavailable.";
  if (marks === null) return null;
  if (!Number.isFinite(marks) || marks < 0 || marks > maximum) return `Marks must be between 0 and ${maximum}.`;
  return null;
}
