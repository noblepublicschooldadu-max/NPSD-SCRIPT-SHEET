import { apiFailure } from "@/lib/api/http";

// Public notices must still come from a trusted backend that filters strictly to
// approved, currently published public-audience notices. No source is configured yet.
export async function GET() {
  return apiFailure("NOT_CONFIGURED", "Public notices are unavailable until the approved school API is configured.", 503);
}
