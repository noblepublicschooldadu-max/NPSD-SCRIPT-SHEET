import { apiFailure, readJson } from "@/lib/api/http";
import { validateAdmissionApplication, type AdmissionApplicationInput } from "@/lib/admissions/contracts";

const allowed = ["applicantName", "dateOfBirth", "requestedClass", "guardianName", "guardianPhone", "address", "previousSchool", "existingGrNumber", "academicYear", "consent"] as const;

export async function POST(request: Request) {
  let body: unknown;
  try { body = await readJson(request); } catch { return apiFailure("INVALID_INPUT", "Send a valid JSON application.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return apiFailure("INVALID_INPUT", "The application is invalid.", 400);
  const raw = body as Record<string, unknown>;
  if (Object.keys(raw).some(key => !(allowed as readonly string[]).includes(key)) || allowed.some(key => raw[key] !== undefined && typeof raw[key] !== (key === "requestedClass" ? "number" : key === "consent" ? "boolean" : "string"))) {
    return apiFailure("INVALID_INPUT", "The application contains unsupported or invalid fields.", 400);
  }
  const errors = validateAdmissionApplication(raw as unknown as Partial<AdmissionApplicationInput>);
  if (Object.keys(errors).length) return apiFailure("INVALID_INPUT", "Please correct the application fields.", 400, errors as Record<string, string>);
  // Fail closed until a trusted Apps Script channel, durable storage, duplicate lock,
  // backend-generated reference and audit transaction are configured.
  return apiFailure("NOT_CONFIGURED", "Online admissions are not accepting applications yet. No application was saved.", 503);
}

export async function GET() {
  return apiFailure("NOT_CONFIGURED", "Public application lookup is disabled until a secure verification service is configured.", 503);
}
