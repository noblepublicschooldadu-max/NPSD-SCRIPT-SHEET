import { apiFailure, readJson } from "@/lib/api/http";
import { validateRecovery } from "@/lib/validation/auth";
export async function POST(request: Request) {
  let body: unknown;
  try { body = await readJson(request); } catch { return apiFailure("INVALID_INPUT", "Send a valid JSON request.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "identifier") || !("identifier" in body) || typeof body.identifier !== "string") return apiFailure("INVALID_INPUT", "The recovery request is invalid.", 400);
  const checked = validateRecovery(body.identifier);
  if (!checked.ok) return apiFailure("INVALID_INPUT", "Check the account identifier.", 400, checked.errors);
  return apiFailure("NOT_CONFIGURED", "Password recovery is not enabled because verified delivery and secure token validation are not configured.", 503);
}
