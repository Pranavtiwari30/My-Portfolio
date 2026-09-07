import type { z } from "zod"

export class RequestError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "RequestError"
    this.status = status
  }
}

/** Bound decoded JSON before parsing; contact's original limit is UTF-16 chars. */
export async function readJson<T>(
  req: Request,
  schema: z.ZodType<T>,
  maxChars = 128_000
): Promise<T> {
  const reader = req.body?.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let length = 0
  const cancelReader = (): void => {
    void reader?.cancel(req.signal.reason).catch(() => undefined)
  }
  req.signal.addEventListener("abort", cancelReader, { once: true })
  try {
    if (reader) {
      for (;;) {
        req.signal.throwIfAborted()
        const { done, value } = await reader.read()
        req.signal.throwIfAborted()
        const chunk = decoder.decode(value, { stream: !done })
        length += chunk.length
        if (length > maxChars) throw new RequestError("Payload too large.", 413)
        chunks.push(chunk)
        if (done) break
      }
    }
  } catch (error) {
    // Cancellation cleanup must not replace the original read/validation error.
    void reader?.cancel().catch(() => undefined)
    throw error
  } finally {
    req.signal.removeEventListener("abort", cancelReader)
    reader?.releaseLock()
  }

  let body: unknown
  try {
    body = JSON.parse(chunks.join(""))
  } catch {
    throw new RequestError("Invalid JSON body.")
  }
  const result = schema.safeParse(body)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new RequestError(
      issue?.code === "custom" ? issue.message : "Invalid request body."
    )
  }
  return result.data
}
