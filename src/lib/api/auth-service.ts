import type { ApiResponse, RegistrationReceipt } from "@/lib/auth/contracts";
import type { RegistrationInput } from "@/lib/validation/auth";
export class SchoolApiError extends Error {
  constructor(message: string, readonly code = "UNAVAILABLE", readonly fieldErrors?: Record<string, string>) { super(message); this.name = "SchoolApiError"; }
}
async function request<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", credentials: "same-origin" }); }
  catch { throw new SchoolApiError("The school portal service is temporarily unavailable. No information was submitted.", "UNAVAILABLE"); }
  let payload: ApiResponse<T>;
  try { payload = await response.json() as ApiResponse<T>; }
  catch { throw new SchoolApiError("The school service returned an invalid response."); }
  if (!payload || typeof payload !== "object" || typeof payload.ok !== "boolean") throw new SchoolApiError("The school service returned an invalid response.");
  if (!response.ok || !payload.ok) {
    if (!payload.ok) throw new SchoolApiError(payload.error.message || "The request could not be completed.", payload.error.code, payload.error.fieldErrors);
    throw new SchoolApiError("The request could not be completed.");
  }
  return payload.data;
}
export const authService = {
  login: (identifier: string, password: string) => request<never>("/api/auth/login", { identifier, password }),
  submitRegistration: (input: RegistrationInput) => request<RegistrationReceipt>("/api/registration-requests", input),
  requestRecovery: (identifier: string) => request<{ accepted: true }>("/api/auth/recovery-requests", { identifier }),
};
