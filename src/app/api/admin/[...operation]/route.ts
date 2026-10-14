import { apiFailure } from "@/lib/api/http";
// Fail closed until a real server-side session verifier and trusted Apps Script channel exist.
// Do not trust role headers, query parameters, client state or caller-supplied user IDs.
function unavailable(){return apiFailure("NOT_CONFIGURED","Admin services are unavailable until secure server-side session verification and the school API are configured.",503)}
export async function GET(){return unavailable()} export async function POST(){return unavailable()} export async function PUT(){return unavailable()} export async function PATCH(){return unavailable()} export async function DELETE(){return unavailable()}
