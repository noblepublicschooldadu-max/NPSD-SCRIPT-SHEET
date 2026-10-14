export type UserRole = "admin" | "teacher" | "student";
export type AccountStatus = "pending" | "active" | "suspended" | "revoked";
export type RegistrationStatus = "pending" | "approved" | "rejected";
export type ApiErrorCode = "NOT_CONFIGURED" | "INVALID_INPUT" | "UNAUTHENTICATED" | "FORBIDDEN" | "RATE_LIMITED" | "DUPLICATE_REQUEST" | "UNAVAILABLE";
export type ApiResponse<T> = { ok: true; data: T; requestId?: string } | { ok: false; error: { code: ApiErrorCode; message: string; fieldErrors?: Record<string, string> }; requestId?: string };
export type RegistrationReceipt = { reference: string; status: "pending"; submittedAt: string };
export type SessionUser = { userId: string; role: UserRole; status: AccountStatus; displayName: string; expiresAt: string };
