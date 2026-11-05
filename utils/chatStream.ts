/** Decode complete events even when network chunks split Unicode or lines. */
export async function readChatStream(response: Response, onText: (text: string) => void, signal?: AbortSignal): Promise<any> {
  if (!response.ok) throw new Error("Request failed")
  if (!response.headers?.get("content-type")?.includes("application/x-ndjson")) return response.json()
  if (!response.body) throw new Error("Missing response stream")
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  const abort = () => { void reader.cancel() }
  signal?.addEventListener("abort", abort, { once: true })
  try {
    while (true) {
      if (signal?.aborted) throw new Error("Aborted")
      const { value, done } = await reader.read()
      if (signal?.aborted) throw new Error("Aborted")
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""
      if (done && buffer.trim()) lines.push(buffer)
      for (const line of lines) {
        if (!line.trim()) continue
        const event = JSON.parse(line)
        if (event.type === "error") throw new Error("Response interrupted")
        if (event.type === "text" && typeof event.text === "string") onText(event.text)
        if (event.type === "done") return event.data
      }
      if (done) throw new Error("Incomplete response")
    }
  } finally {
    signal?.removeEventListener("abort", abort)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
