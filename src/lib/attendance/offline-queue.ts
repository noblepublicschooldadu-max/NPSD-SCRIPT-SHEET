import type { AttendanceBatch } from "./contracts";

/** Deliberately memory-only. Queue is lost on reload/close and contains IDs/statuses only, never names or credentials. */
export type QueuedAttendance = { batch: AttendanceBatch; state: "pending" | "syncing" | "failed"; queuedAt: number; lastError?: string };
const queue = new Map<string, QueuedAttendance>();
let scope = "";
export function setAttendanceQueueScope(nextScope: string) {
  if (scope && scope !== nextScope) queue.clear();
  scope = nextScope;
}
export function enqueueAttendance(batch: AttendanceBatch): QueuedAttendance {
  const item: QueuedAttendance = { batch, state: "pending", queuedAt: Date.now() };
  queue.set(batch.operationId, item);
  return item;
}
export function listQueuedAttendance() { return [...queue.values()].map((item) => ({ ...item, batch: { ...item.batch, entries: item.batch.entries.map((entry) => ({ ...entry })) } })); }
export function updateQueuedAttendance(operationId: string, patch: Partial<QueuedAttendance>) {
  const item = queue.get(operationId); if (!item) return;
  queue.set(operationId, { ...item, ...patch });
}
export function removeQueuedAttendance(operationId: string) { queue.delete(operationId); }
export function clearAttendanceQueue() { queue.clear(); }
