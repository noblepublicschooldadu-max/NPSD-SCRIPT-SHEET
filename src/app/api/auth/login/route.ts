import { apiFailure, jsonResponse, readJson } from "@/lib/api/http";
import { validateLogin } from "@/lib/validation/auth";
export async function POST(request: Request) {
  let body: unknown;
  try { body = await readJson(request); } catch { return apiFailure("INVALID_INPUT", "Send a valid JSON request.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "identifier" && key !== "password") || !("identifier" in body) || !("password" in body) || typeof body.identifier !== "string" || typeof body.password !== "string") return apiFailure("INVALID_INPUT", "The sign-in request is invalid.", 400);
  const checked = validateLogin({ identifier: body.identifier, password: body.password });
  if (!checked.ok) return apiFailure("INVALID_INPUT", "Check the sign-in fields.", 400, checked.errors);
  // Fail closed: no credential verifier or secure session store is configured.
  return apiFailure("NOT_CONFIGURED", "Sign-in is not enabled because the secure school authentication service is not configured.", 503);
}
export async function GET() { return jsonResponse({ ok: false, error: { code: "UNAVAILABLE", message: "Method not allowed." } }, 405); }
