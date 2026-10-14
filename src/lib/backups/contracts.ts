export const BACKUP_SCHEMA_VERSION = 1 as const;
export const BACKUP_STATUSES = ["in_progress", "verified", "failed", "verification_failed", "restore_in_progress", "restore_verified", "restore_failed"] as const;
export type BackupStatus = typeof BACKUP_STATUSES[number];
export type BackupScopeItem = { sheetKey: string; included: boolean; recordCount?: number; reason?: string };
export type BackupRecord = {
  backupId: string;
  createdAt: string;
  actor: string;
  scope: BackupScopeItem[];
  schemaVersion: number;
  storageRef: string;
  status: BackupStatus;
  verification: "pending" | "verified" | "failed" | "not_run";
  checksum?: string;
  sizeBytes?: number;
  recordCounts?: Record<string, number>;
  safeError?: string;
  restoreInProgress?: boolean;
};
export type BackupDashboardData = {
  backups: BackupRecord[];
  refreshedAt: string;
  capabilities: { manualBackup: boolean; scheduleManagement: boolean; restore: boolean; retentionManagement: boolean };
  schedule: { enabled: boolean; frequency: "daily" | "weekly" | null; timezone: string | null; lastRunAt: string | null; lastResult: string | null } | null;
  retention: { keepVerified: number; policyDescription: string } | null;
};

const statuses = new Set<string>(BACKUP_STATUSES);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isoDate = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
export function isBackupRecord(v: unknown): v is BackupRecord {
  if (!isRecord(v)) return false;
  return typeof v.backupId === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(v.backupId)
    && isoDate(v.createdAt) && typeof v.actor === "string" && Array.isArray(v.scope)
    && Number.isInteger(v.schemaVersion) && typeof v.storageRef === "string"
    && statuses.has(String(v.status)) && ["pending", "verified", "failed", "not_run"].includes(String(v.verification))
    && (v.sizeBytes === undefined || (typeof v.sizeBytes === "number" && Number.isFinite(v.sizeBytes) && v.sizeBytes >= 0))
    && v.scope.every((s: unknown) => isRecord(s) && typeof s.sheetKey === "string" && typeof s.included === "boolean" && (s.recordCount === undefined || (typeof s.recordCount === "number" && Number.isInteger(s.recordCount) && s.recordCount >= 0)));
}
export function isBackupDashboardData(v: unknown): v is BackupDashboardData {
  if (!isRecord(v) || !Array.isArray(v.backups) || !v.backups.every(isBackupRecord) || !isoDate(v.refreshedAt) || !isRecord(v.capabilities)) return false;
  const c = v.capabilities;
  if (![c.manualBackup, c.scheduleManagement, c.restore, c.retentionManagement].every(x => typeof x === "boolean")) return false;
  if (v.schedule !== null && (!isRecord(v.schedule) || typeof v.schedule.enabled !== "boolean" || !["daily", "weekly", null].includes(String(v.schedule.frequency)))) return false;
  if (v.retention !== null && (!isRecord(v.retention) || !Number.isInteger(v.retention.keepVerified) || (v.retention.keepVerified as number) < 1 || typeof v.retention.policyDescription !== "string")) return false;
  return true;
}
export function latestVerifiedBackup(records: BackupRecord[]): BackupRecord | null {
  return records.filter(r => r.status === "verified" && r.verification === "verified").sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt))[0] ?? null;
}
/** Candidate IDs only; the caller must re-check under a backend lock immediately before deletion. */
export function retentionDeletionCandidates(records: BackupRecord[], keepVerified: number): string[] {
  if (!Number.isInteger(keepVerified) || keepVerified < 1) throw new Error("Retention must keep at least one verified backup.");
  const verified = records.filter(r => r.status === "verified" && r.verification === "verified").sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt));
  const protectedIds = new Set([verified[0]?.backupId, ...verified.slice(0, keepVerified).map(r => r.backupId)]);
  return verified.slice(keepVerified).filter(r => !r.restoreInProgress && r.status === "verified" && r.verification === "verified" && !protectedIds.has(r.backupId)).map(r => r.backupId);
}
export function canRestoreBackup(record: BackupRecord | null): boolean {
  return !!record && record.status === "verified" && record.verification === "verified" && record.schemaVersion === BACKUP_SCHEMA_VERSION && !record.restoreInProgress;
}
export function safeBackupError(value: unknown): string {
  const raw = typeof value === "string" ? value : "Backup operation failed.";
  return raw.replace(/(password|token|secret|credential|authorization|spreadsheetId|fileId)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]").slice(0, 240);
}
