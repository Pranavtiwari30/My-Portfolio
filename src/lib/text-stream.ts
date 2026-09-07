/** Consume plain UTF-8 text while propagating cancellation to the reader. */
export async function readTextStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onText: (text: string) => void
): Promise<string> {
  signal.throwIfAborted()
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let text = ""
  let completed = false

  // Cancelling also wakes a pending read when a stream source does not itself
  // observe the fetch signal. Cleanup errors must not replace the read error.
  const cancelReader = (): void => {
    void reader.cancel(signal.reason).catch(() => undefined)
  }
  signal.addEventListener("abort", cancelReader, { once: true })

  try {
    for (;;) {
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      if (chunk) {
        text += chunk
        onText(text)
      }
    }

    const tail = decoder.decode()
    if (tail) {
      text += tail
      onText(text)
    }
    completed = true
    return text
  } finally {
    signal.removeEventListener("abort", cancelReader)
    if (!completed) cancelReader()
    reader.releaseLock()
  }
}
