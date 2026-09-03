import { useCallback, useEffect, useRef, useState } from "react"

export type StreamStatus = "idle" | "streaming" | "done" | "error"

type UseTextStream = {
  text: string
  status: StreamStatus
  error: string | null
  /**
   * POST `body` as JSON and stream the plain-text response into `text`.
   * Resolves with the full text on success, or `null` if it errored/aborted.
   */
  run: (body: unknown) => Promise<string | null>
  stop: () => void
  reset: () => void
}

/**
 * Minimal client for an endpoint that returns a streamed `text/plain` body
 * (AI SDK `result.toTextStreamResponse()`). Keeps the client bundle tiny.
 */
export function useTextStream(endpoint: string): UseTextStream {
  const [text, setText] = useState("")
  const [status, setStatus] = useState<StreamStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setStatus((s) => (s === "streaming" ? "done" : s))
  }, [])

  const reset = useCallback(() => {
    setText("")
    setError(null)
    setStatus("idle")
  }, [])

  const run = useCallback(
    async (body: unknown): Promise<string | null> => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setText("")
      setError(null)
      setStatus("streaming")

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          const payload = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(payload?.error ?? `Request failed (${res.status}).`)
        }

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()

        let acc = ""
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            acc += value
            setText(acc)
          }
        }
        setStatus("done")
        return acc
      } catch (err) {
        if ((err as Error).name === "AbortError") return null
        setError((err as Error).message || "Something went wrong.")
        setStatus("error")
        return null
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null
      }
    },
    [endpoint]
  )

  useEffect(() => () => controllerRef.current?.abort(), [])

  return { text, status, error, run, stop, reset }
}
