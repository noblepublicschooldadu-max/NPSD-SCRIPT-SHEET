export type StudentEnvelope<T> = { ok: true; data: T; requestId?: string } | { ok: false; error: { code: string; message: string }; requestId?: string };

export class StudentApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "StudentApiError";
  }
}

/** Same-origin cookie-session client. No token or student identifier is stored in browser storage. */
export async function studentRequest<T>(operation: string): Promise<T> {
  const safe = operation.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  let response: Response;
  try {
    response = await fetch(`/api/student/${safe}`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
  } catch {
    throw new StudentApiError("Network connection failed. Your school records were not loaded. Reconnect and try again.", 0, "NETWORK_ERROR");
  }
  let envelope: StudentEnvelope<T>;
  try { envelope = await response.json() as StudentEnvelope<T>; }
  catch { throw new StudentApiError("The school service returned an unreadable response.", response.status, "INVALID_RESPONSE"); }
  if (!response.ok || !envelope.ok) {
    const error = "error" in envelope ? envelope.error : { code: "UNAVAILABLE", message: "The school service is unavailable." };
    throw new StudentApiError(error.message, response.status, error.code);
  }
  return envelope.data;
}
