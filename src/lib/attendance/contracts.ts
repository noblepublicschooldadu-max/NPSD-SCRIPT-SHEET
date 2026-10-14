export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];
export type AttendanceEntry = { studentId: string; status: AttendanceStatus };
export type AttendanceBatch = { operationId: string; classId: string; date: string; entries: AttendanceEntry[]; expectedVersion?: string };
export type AttendanceRecord = { recordId: string; studentId: string; studentName?: string; grNumber?: string; classId: string; section?: string; date: string; status: AttendanceStatus | "unmarked"; version?: string; updatedAt?: string };

export function validateSchoolDate(value: string, minDate?: string, maxDate?: string): string | null {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return "Choose a valid school-local date.";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return "Choose a valid school-local date.";
  if (minDate && value < minDate) return "This date is earlier than the permitted attendance period.";
  if (maxDate && value > maxDate) return "This date is later than the permitted attendance period.";
  return null;
}
export function validateAttendanceBatch(entries: Array<{studentId: string; status: string}>): string | null {
  if (!Array.isArray(entries) || entries.length === 0) return "Select at least one student status before submitting.";
  const ids = entries.map((entry) => typeof entry?.studentId === "string" ? entry.studentId.trim() : "");
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return "Student IDs must be present and unique.";
  const allowed = new Set<string>(ATTENDANCE_STATUSES);
  if (entries.some((entry) => !allowed.has(entry.status))) return "One or more attendance statuses are invalid.";
  return null;
}
export function summarizeAttendanceStatuses(statuses: Array<string | null | undefined>) {
  const summary = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0, total: statuses.length, recorded: 0 };
  for (const status of statuses) {
    if (status === "present" || status === "absent" || status === "late" || status === "excused") { summary[status] += 1; summary.recorded += 1; }
    else summary.unmarked += 1;
  }
  return summary;
}
export function hasAttendanceConflict(localVersion: string | undefined, serverVersion: string | undefined) {
  return Boolean(localVersion && serverVersion && localVersion !== serverVersion);
}
/** CSV formula-injection guard for spreadsheet-opened exports. */
export function csvSafe(value: unknown): string {
  const text = value == null ? "" : String(value);
  const escaped = /^(?:[\u0000-\u0020\uFEFF]*[=+\-@]|[\t\r\n])/.test(text) ? `'${text}` : text;
  return `"${escaped.replaceAll('"', '""')}"`;
}

let operationSequence = 0;
/** Unique retry key, not an authorization token. Uses Web Crypto when available. */
export function createAttendanceOperationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return `attendance-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  operationSequence += 1;
  return `attendance-${Date.now()}-${operationSequence}`;
}
