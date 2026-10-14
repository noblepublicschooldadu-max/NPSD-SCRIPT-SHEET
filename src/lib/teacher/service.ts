export type TeacherEnvelope<T> = { ok: true; data: T; requestId?: string } | { ok: false; error: { code: string; message: string }; requestId?: string };
export class TeacherApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); this.name = "TeacherApiError"; }
}
/** Same-origin, cookie-session API client. It deliberately never stores tokens in browser storage. */
export async function teacherRequest<T>(operation: string, init?: RequestInit): Promise<T> {
  const [path, rawQuery] = operation.split("?", 2);
  const safe = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  const query = rawQuery ? `?${new URLSearchParams(rawQuery).toString()}` : "";
  let response: Response;
  try {
    response = await fetch(`/api/teacher/${safe}${query}`, { ...init, credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  } catch { throw new TeacherApiError("Network connection failed. Nothing was confirmed; reconnect and check operation status before retrying.", 0, "NETWORK_ERROR"); }
  let envelope: TeacherEnvelope<T>;
  try { envelope = await response.json() as TeacherEnvelope<T>; }
  catch { throw new TeacherApiError("The school service returned an unreadable response.", response.status, "INVALID_RESPONSE"); }
  if (!response.ok || !envelope.ok) {
    const error = "error" in envelope ? envelope.error : { code: "UNAVAILABLE", message: "The school service is unavailable." };
    throw new TeacherApiError(error.message, response.status, error.code);
  }
  return envelope.data;
}
