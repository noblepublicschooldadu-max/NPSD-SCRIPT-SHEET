import { apiFailure, readJson } from "@/lib/api/http";
import { validateRegistration, type RegistrationInput } from "@/lib/validation/auth";
export async function POST(request: Request) {
  let body: unknown;
  try { body = await readJson(request); } catch { return apiFailure("INVALID_INPUT", "Send a valid JSON request.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return apiFailure("INVALID_INPUT", "The registration request is invalid.", 400);
  const raw = body as Record<string, unknown>;
  const allowed = ["studentName", "grNumber", "classLevel", "section", "guardianName", "guardianContact", "guardianEmail"];
  if (Object.keys(raw).some(key => !allowed.includes(key)) || allowed.some(key => typeof raw[key] !== "string" && raw[key] !== undefined)) return apiFailure("INVALID_INPUT", "The registration request contains invalid fields.", 400);
  const checked = validateRegistration(raw as unknown as RegistrationInput);
  if (!checked.ok) return apiFailure("INVALID_INPUT", "Check the registration fields.", 400, checked.errors);
  // No receipt is issued until durable storage and duplicate protection are available.
  return apiFailure("NOT_CONFIGURED", "Registration is not available yet because the school backend is not configured. No request was saved.", 503);
}
