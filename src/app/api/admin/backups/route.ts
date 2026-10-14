import { apiFailure } from "@/lib/api/http";
// Fail closed: this repository has no verified server-side session verifier, Apps Script transport,
// live workbook schema, or restricted Drive backup folder. Never infer authorization from the browser.
function unavailable() {
  return apiFailure("NOT_CONFIGURED", "Backup services are unavailable until secure Admin session verification and the trusted school backup backend are configured.", 503);
}
export async function GET() { return unavailable(); }
export async function POST() { return unavailable(); }
export async function PUT() { return unavailable(); }
export async function PATCH() { return unavailable(); }
export async function DELETE() { return unavailable(); }
