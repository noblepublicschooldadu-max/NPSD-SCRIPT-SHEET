import { apiFailure } from "@/lib/api/http";

// Fail closed. This project has no secure server-side session verifier or trusted Apps Script channel.
// Do not accept student IDs, role headers, or identity assertions from the browser.
function unavailable() {
  return apiFailure("NOT_CONFIGURED", "Student services are unavailable until session validation, session-derived student identity, published-record filtering, and the trusted school API are configured.", 503);
}
export async function GET() { return unavailable(); }
export async function POST() { return unavailable(); }
export async function PUT() { return unavailable(); }
export async function PATCH() { return unavailable(); }
export async function DELETE() { return unavailable(); }
