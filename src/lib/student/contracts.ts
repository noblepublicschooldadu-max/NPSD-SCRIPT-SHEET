export const STUDENT_SECTIONS = [
  { slug: "", label: "Dashboard", icon: "⌂" },
  { slug: "profile", label: "My profile", icon: "◉" },
  { slug: "attendance", label: "Attendance", icon: "✓" },
  { slug: "id-card", label: "Student ID card", icon: "▤" },
  { slug: "homework", label: "Homework", icon: "✎" },
  { slug: "timetable", label: "Timetable", icon: "▦" },
  { slug: "results", label: "Exam results", icon: "▥" },
  { slug: "notices", label: "Notices", icon: "▣" },
  { slug: "settings", label: "Account settings", icon: "⚙" },
] as const;

export type StudentAttendanceStatus = "present" | "absent" | "late" | "excused" | "unmarked" | string;
export type StudentAttendanceRecord = { date: string; status: StudentAttendanceStatus };
export type StudentAttendanceSummary = { present: number; absent: number; late?: number; excused?: number; unmarked?: number; recorded: number; total: number };
export type StudentProfile = {
  name: string;
  officialIdentifier: string;
  className: string;
  section: string;
  classId?: string;
  sectionId?: string;
  academicYear?: string;
  enrollmentStatus?: string;
  guardianName?: string;
  guardianContact?: string;
};
export type StudentIdCardData = StudentProfile & {
  schoolName: string;
  photoUrl?: string;
  approved?: boolean;
  officialRecordVerified?: boolean;
  academicYear: string;
};

/** Summarize only valid records; missing/unmarked days are never counted as absences. */
export function summarizeAttendance(records: StudentAttendanceRecord[]): StudentAttendanceSummary {
  const summary: StudentAttendanceSummary = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0, recorded: 0, total: 0 };
  for (const record of records) {
    if (!record || typeof record.date !== "string" || !record.date.trim()) continue;
    summary.total += 1;
    if (["present", "absent", "late", "excused"].includes(record.status)) {
      summary[record.status as "present" | "absent" | "late" | "excused"] += 1;
      summary.recorded += 1;
    } else {
      summary.unmarked = (summary.unmarked ?? 0) + 1;
    }
  }
  return summary;
}

/** Never put student identifiers or profile data in a QR code. QR stays disabled until a secure opaque-token API exists. */
export function canRenderStudentIdCard(data: Partial<StudentIdCardData> | null | undefined): data is StudentIdCardData {
  return Boolean(data && data.approved === true && data.officialRecordVerified === true && data.name?.trim() && data.officialIdentifier?.trim() && data.className?.trim() && data.section?.trim() && data.academicYear?.trim() && data.schoolName?.trim());
}

export const STUDENT_API_OPERATIONS: Record<string, string> = {
  "": "dashboard",
  profile: "profile",
  attendance: "attendance",
  "id-card": "id-card",
  homework: "homework",
  timetable: "timetable",
  results: "results",
  notices: "notices",
  settings: "settings",
};
