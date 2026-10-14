export type CardStatus = "active" | "replaced" | "revoked" | "pending";
export type OfficialCardStudent = {
  id: string;
  name: string;
  officialIdentifier: string;
  className: string;
  section: string;
  academicYear: string;
  enrollmentStatus: "enrolled" | "inactive" | "pending";
  verified: boolean;
  photoAvailable: boolean;
};
export type IdCardRecord = {
  id: string;
  studentRecordId: string;
  academicYear: string;
  status: CardStatus;
  createdAt: string;
  createdBy: string;
  replacedAt?: string;
  revokedAt?: string;
  revocationReason?: string;
  auditEvents?: Array<{ action: string; timestamp: string; actor: string }>;
};
export type CardPreviewData = OfficialCardStudent & {
  schoolName?: string;
  schoolLogoUrl?: string;
  photoUrl?: string;
  schoolContact?: string;
  cardStatus?: CardStatus;
  approved?: boolean;
};

/** Only verified, currently enrolled official records can be selected for issuance. */
export function isEligibleForCard(student: Partial<OfficialCardStudent> | null | undefined): student is OfficialCardStudent {
  return Boolean(student && student.id?.trim() && student.name?.trim() && student.officialIdentifier?.trim() && student.className?.trim() && student.section?.trim() && student.academicYear?.trim() && student.verified === true && student.enrollmentStatus === "enrolled");
}

/** Prevent duplicate active cards for one official student + academic year. */
export function hasDuplicateActiveCard(cards: IdCardRecord[], studentRecordId: string, academicYear: string, excludingId?: string): boolean {
  return cards.some((card) => card.id !== excludingId && card.studentRecordId === studentRecordId && card.academicYear === academicYear && card.status === "active");
}

export type PhotoValidation = { ok: true; mimeType: string; maxBytes: number } | { ok: false; reason: "UNSUPPORTED_TYPE" | "TOO_LARGE" | "EMPTY" };
/** UI-level guard only. The trusted backend must repeat MIME sniffing, decode validation and size checks. */
export function validateStudentPhoto(file: { type?: string; size?: number } | null | undefined, maxBytes = 5 * 1024 * 1024): PhotoValidation {
  if (!file || !Number.isFinite(file.size) || (file.size ?? 0) <= 0) return { ok: false, reason: "EMPTY" };
  if ((file.size ?? 0) > maxBytes) return { ok: false, reason: "TOO_LARGE" };
  const mimeType = file.type ?? "";
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(mimeType)) return { ok: false, reason: "UNSUPPORTED_TYPE" };
  return { ok: true, mimeType, maxBytes };
}

/** Never put student identifiers or profile data in a QR code. Never accept a student number, profile object, or caller-provided secret as a QR token. */
export function isOpaqueVerificationUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    const token = segments[1] ?? "";
    return url.protocol === "https:" && segments.length === 2 && segments[0] === "verify-card" && /^[A-Za-z0-9_-]{22,}$/.test(token) && !url.search && !url.hash;
  } catch { return false; }
}

export const ID_CARD_API_CONTRACT = {
  adminStudents: "GET /v1/admin/id-cards/students?q=&classLevel=&section=&academicYear=&page=&pageSize=",
  adminCards: "GET /v1/admin/id-cards?status=&academicYear=&page=&pageSize=",
  preview: "GET /v1/admin/id-cards/students/:studentRecordId/preview",
  issue: "POST /v1/admin/id-cards/issue {studentRecordIds,academicYear,idempotencyKey}",
  replace: "POST /v1/admin/id-cards/:cardId/replace {reason,idempotencyKey}",
  revoke: "POST /v1/admin/id-cards/:cardId/revoke {reason,idempotencyKey}",
  audit: "GET /v1/admin/id-cards/:cardId/audit",
  photo: "POST /v1/admin/students/:studentRecordId/photo (multipart, private Drive, MIME sniff and size validation)",
  studentCard: "GET /v1/student/id-card (identity from validated session; never accepts student ID)",
  verify: "GET /v1/public/id-card-verification/:opaqueToken (minimum approved disclosure; active token only)",
} as const;
