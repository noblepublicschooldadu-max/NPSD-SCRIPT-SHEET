export type NoticeStatus = "draft" | "published" | "expired" | "archived" | "withdrawn";
export type NoticeAudience = "public" | "teachers" | "students" | "classes" | "admins";
export type NoticeRecord = {
  id: string;
  title: string;
  body: string;
  category?: string;
  audience: NoticeAudience;
  status: NoticeStatus;
  published?: boolean;
  publicApproved?: boolean;
  publishedAt?: string;
  scheduledAt?: string;
  expiresAt?: string;
  classIds?: string[];
  sectionIds?: string[];
  creatorName?: string;
  createdAt?: string;
  updatedAt?: string;
  attachmentId?: string;
  attachmentName?: string;
  attachmentAvailable?: boolean;
  version?: number;
  history?: Array<{ action: string; actor?: string; timestamp: string; reason?: string }>;
};
export type NoticeDraft = {
  title: string;
  body: string;
  category: string;
  audience: NoticeAudience;
  expiresAt?: string;
  classIds?: string[];
  sectionIds?: string[];
  attachmentId?: string;
};
const knownAudiences = new Set<NoticeAudience>(["public", "teachers", "students", "classes", "admins"]);
const knownStatuses = new Set<NoticeStatus>(["draft", "published", "expired", "archived", "withdrawn"]);
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateNoticeDraft(input: Partial<NoticeDraft>, now = new Date()): string | null {
  if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 160) return "Enter a notice title of 1–160 characters.";
  if (typeof input.body !== "string" || !input.body.trim() || input.body.trim().length > 12000) return "Enter notice content of 1–12,000 characters.";
  if (typeof input.category !== "string" || !input.category.trim() || input.category.trim().length > 60) return "Enter a category of up to 60 characters.";
  if (!input.audience || !knownAudiences.has(input.audience)) return "Choose a supported notice audience.";
  if (input.audience === "classes" && (!(input.classIds?.length || input.sectionIds?.length) || [...(input.classIds ?? []), ...(input.sectionIds ?? [])].some(id => !id.trim()))) return "Select at least one authorized class or section for a class notice.";
  if (input.expiresAt) {
    if (!isCalendarDate(input.expiresAt)) return "Choose a valid expiry date.";
    if (input.expiresAt < now.toISOString().slice(0, 10)) return "Expiry date cannot be in the past.";
  }
  if (input.audience === "public" && /(?:GR\s*No|guardian|student\s*(?:name|id|phone)|phone\s*number|medical|address\s*:)/i.test(`${input.title}\n${input.body}`)) return "Public notices cannot include private student or family information.";
  return null;
}
export function isNoticeRecord(value: unknown): value is NoticeRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<NoticeRecord>;
  return typeof item.id === "string" && !!item.id.trim() && typeof item.title === "string" && typeof item.body === "string" && typeof item.audience === "string" && knownAudiences.has(item.audience as NoticeAudience) && typeof item.status === "string" && knownStatuses.has(item.status as NoticeStatus);
}
export function isPublishedNow(item: Partial<NoticeRecord>, now = new Date()): boolean {
  if (item.status !== "published" || item.published !== true || typeof item.publishedAt !== "string") return false;
  const published = Date.parse(item.publishedAt);
  if (!Number.isFinite(published) || published > now.getTime()) return false;
  if (item.expiresAt) {
    const expiry = Date.parse(item.expiresAt.length === 10 ? `${item.expiresAt}T23:59:59.999` : item.expiresAt);
    if (!Number.isFinite(expiry) || expiry < now.getTime()) return false;
  }
  return true;
}
export function publicNoticeVisible(item: Partial<NoticeRecord>, now = new Date()): boolean {
  return item.audience === "public" && item.publicApproved === true && isPublishedNow(item, now);
}
export function teacherNoticeVisible(item: Partial<NoticeRecord>, scope: { classIds?: string[]; sectionIds?: string[] } = {}, now = new Date()): boolean {
  if (!isPublishedNow(item, now)) return false;
  if (item.audience === "teachers") return true;
  if (item.audience === "public") return item.publicApproved === true;
  if (item.audience !== "classes") return false;
  const targetClasses = item.classIds ?? [];
  const targetSections = item.sectionIds ?? [];
  if (!targetClasses.length && !targetSections.length) return false;
  if (targetClasses.length && !targetClasses.some(id => (scope.classIds ?? []).includes(id))) return false;
  if (targetSections.length && !targetSections.some(id => (scope.sectionIds ?? []).includes(id))) return false;
  return true;
}
export function studentNoticeVisible(item: Partial<NoticeRecord>, scope: { classId?: string; sectionId?: string }, now = new Date()): boolean {
  if (!isPublishedNow(item, now)) return false;
  if (item.audience === "students") return true;
  if (item.audience === "public") return item.publicApproved === true;
  if (item.audience !== "classes") return false;
  const targetedClasses = item.classIds ?? [];
  const targetedSections = item.sectionIds ?? [];
  if (!targetedClasses.length && !targetedSections.length) return false;
  if (targetedClasses.length && (!scope.classId || !targetedClasses.includes(scope.classId))) return false;
  if (targetedSections.length && (!scope.sectionId || !targetedSections.includes(scope.sectionId))) return false;
  return true;
}
export function isScheduledForFuture(item: Partial<NoticeRecord>, now = new Date()): boolean {
  if (!item.scheduledAt) return false;
  const time = Date.parse(item.scheduledAt);
  return Number.isFinite(time) && time > now.getTime();
}
export function uniqueNoticeIds(ids: string[]): string[] {
  return [...new Set(ids.map(id => id.trim()).filter(Boolean))];
}
export function noticeOperationKey(noticeId: string, action: string, version: number): string {
  return `${noticeId.trim()}:${action.trim()}:${version}`;
}
