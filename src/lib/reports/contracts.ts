import { csvSafe } from "@/lib/attendance/contracts";

export const REPORT_CATEGORIES = ["overview", "attendance", "enrollment", "admissions", "examinations"] as const;
export type ReportCategory = typeof REPORT_CATEGORIES[number];
export type ReportFilters = { startDate: string; endDate: string; academicYearId: string; classId: string; sectionId: string; category: ReportCategory };
export type ReportMetric = { key: string; label: string; value: number; unit?: string; definition?: string };
export type ReportSeries = { key: string; label: string; value: number };
export type ReportTable = { title: string; columns: string[]; rows: Array<Array<string | number | null>> };
export type ReportPayload = {
  generatedAt: string;
  refreshedAt: string;
  period: { startDate: string | null; endDate: string | null; academicYearLabel?: string | null };
  appliedFilters: Partial<ReportFilters>;
  source: string;
  metrics: ReportMetric[];
  series?: ReportSeries[];
  tables?: ReportTable[];
  partialData?: boolean;
  warnings?: string[];
};

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateReportFilters(filters: ReportFilters): string | null {
  if (!REPORT_CATEGORIES.includes(filters.category)) return "Choose a supported report category.";
  if (filters.startDate && !isValidIsoDate(filters.startDate)) return "Choose a valid start date.";
  if (filters.endDate && !isValidIsoDate(filters.endDate)) return "Choose a valid end date.";
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) return "Start date must be on or before end date.";
  if (filters.sectionId && !filters.classId) return "Choose a class before filtering by section.";
  if (filters.academicYearId.length > 100 || filters.classId.length > 100 || filters.sectionId.length > 100) return "One or more filter values are too long.";
  return null;
}

/** Confirmed attendance percentage excludes unmarked sessions from the denominator. */
export function calculateAttendanceRate(input: { present: number; late?: number; absent: number; excused?: number; unmarked?: number; countExcusedInDenominator: boolean }) {
  const values = [input.present, input.late ?? 0, input.absent, input.excused ?? 0, input.unmarked ?? 0];
  if (values.some((n) => !Number.isSafeInteger(n) || n < 0)) throw new Error("Attendance counts must be non-negative integers.");
  const denominator = input.present + (input.late ?? 0) + input.absent + (input.countExcusedInDenominator ? (input.excused ?? 0) : 0);
  const numerator = input.present + (input.late ?? 0);
  return { numerator, denominator, percentage: denominator ? (numerator / denominator) * 100 : null, unmarkedExcluded: input.unmarked ?? 0, excusedIncluded: input.countExcusedInDenominator };
}

/** Deduplicate retried attendance records by their stable record ID; conflicting duplicates keep the first source row. */
export function deduplicateAttendance<T extends { recordId: string }>(records: T[]): T[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    if (!record.recordId || seen.has(record.recordId)) return false;
    seen.add(record.recordId);
    return true;
  });
}

/** Applications linked to a student are not additional enrollment records. */
export function countUniqueEnrollment(records: Array<{ studentId: string; status?: string | null }>): number {
  return new Set(records.filter((record) => record.studentId && record.status === "active").map((record) => record.studentId)).size;
}

/** Missing marks are omitted, never coerced to zero. */
export function summarizeMarks(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return { recorded: valid.length, missing: values.length - valid.length, average: valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null };
}

export function isReportPayload(value: unknown): value is ReportPayload {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ReportPayload>;
  if (typeof data.generatedAt !== "string" || typeof data.refreshedAt !== "string" || typeof data.source !== "string") return false;
  if (!data.period || typeof data.period !== "object" || !(data.period.startDate === null || typeof data.period.startDate === "string") || !(data.period.endDate === null || typeof data.period.endDate === "string")) return false;
  if (!data.appliedFilters || typeof data.appliedFilters !== "object" || !Array.isArray(data.metrics)) return false;
  if (!data.metrics.every((m) => !!m && typeof m.key === "string" && typeof m.label === "string" && typeof m.value === "number" && Number.isFinite(m.value) && (m.unit === undefined || typeof m.unit === "string") && (m.definition === undefined || typeof m.definition === "string"))) return false;
  if (data.series !== undefined && (!Array.isArray(data.series) || !data.series.every((s) => !!s && typeof s.key === "string" && typeof s.label === "string" && typeof s.value === "number" && Number.isFinite(s.value)))) return false;
  if (data.tables !== undefined && (!Array.isArray(data.tables) || !data.tables.every((table) => !!table && typeof table.title === "string" && Array.isArray(table.columns) && table.columns.every((column) => typeof column === "string") && Array.isArray(table.rows) && table.rows.every((row) => Array.isArray(row) && row.every((cell) => cell === null || typeof cell === "string" || typeof cell === "number"))))) return false;
  if (data.partialData !== undefined && typeof data.partialData !== "boolean") return false;
  if (data.warnings !== undefined && (!Array.isArray(data.warnings) || !data.warnings.every((warning) => typeof warning === "string"))) return false;
  return true;
}

export function reportToCsv(report: ReportPayload): string {
  const lines: string[] = [["Report", report.source], ["Generated at", report.generatedAt], ["Last refreshed", report.refreshedAt], ["Start date", report.period.startDate ?? ""], ["End date", report.period.endDate ?? ""], [], ["Metric", "Value", "Unit", "Definition"], ...report.metrics.map((m) => [m.label, String(m.value), m.unit ?? "", m.definition ?? ""])].map((row) => row.map(csvSafe).join(","));
  for (const table of report.tables ?? []) {
    lines.push("", ...[[table.title], table.columns, ...table.rows].map((row) => row.map(csvSafe).join(",")));
  }
  return `\uFEFF${lines.join("\r\n")}`;
}
