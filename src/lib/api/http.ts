import type { ApiErrorCode, ApiResponse } from "@/lib/auth/contracts";

const MAX_JSON_BYTES = 16_384;

export function jsonResponse<T>(body: ApiResponse<T>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export function apiFailure(code: ApiErrorCode, message: string, status: number, fieldErrors?: Record<string, string>) {
  return jsonResponse<never>({ ok: false, error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } }, status);
}

/**
 * Read bounded JSON without trusting Content-Length: requests can omit it or use
 * streaming transfer. The byte limit is enforced while consuming the body.
 */
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase().includes("application/json")) {
    throw new Error("CONTENT_TYPE");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) throw new Error("CONTENT_LENGTH");
    if (Number(declaredLength) > MAX_JSON_BYTES) throw new Error("TOO_LARGE");
  }
  if (!request.body) throw new Error("EMPTY_BODY");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new Error("TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) throw new Error("EMPTY_BODY");
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new Error("INVALID_JSON");
  }
}
