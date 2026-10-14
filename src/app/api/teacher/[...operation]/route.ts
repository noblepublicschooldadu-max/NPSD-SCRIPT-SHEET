import { apiFailure } from "@/lib/api/http";

// Fail closed: the repository has no secure server-side session verifier or trusted
// server-to-server Apps Script channel yet. Never trust role headers or request IDs.
function unavailable() {
  return apiFailure("NOT_CONFIGURED", "Teacher services are unavailable until session verification, teacher-role checks, assignment authorization and the school API are configured.", 503);
}
export async function GET() { return unavailable(); }
export async function POST() { return unavailable(); }
export async function PUT() { return unavailable(); }
export async function PATCH() { return unavailable(); }
export async function DELETE() { return unavailable(); }
