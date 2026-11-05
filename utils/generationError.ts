// Keep server diagnostics visible without rendering proxy HTML or dumping request payloads.
export async function generationResponseError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null)
  const detail = typeof body?.detail === "string" ? body.detail : ""
  return new Error(`${fallback} (HTTP ${response.status})${detail ? `: ${detail.slice(0, 600)}` : ""}`)
}
