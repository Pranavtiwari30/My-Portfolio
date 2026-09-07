import { useCallback, useEffect, useRef, useState } from "react"

import { errorMessage, requestTextStream } from "./client-api"

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

const STREAM_TIMEOUT_MS = 90_000

/** A cancellable client for AI SDK's plain-text streaming responses. */
export function useTextStream(endpoint: string): UseTextStream {
  const [text, setText] = useState("")
  const [status, setStatus] = useState<StreamStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingTextRef = useRef("")

  const cancel = useCallback((): void => {
    const controller = controllerRef.current
    controllerRef.current = null
    controller?.abort()
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const stop = useCallback((): void => {
    const wasStreaming = controllerRef.current !== null
    cancel()
    if (wasStreaming) setText(pendingTextRef.current)
    setStatus((current) => (current === "streaming" ? "done" : current))
  }, [cancel])

  const reset = useCallback((): void => {
    cancel()
    setText("")
    setError(null)
    setStatus("idle")
  }, [cancel])

  const run = useCallback(
    async (body: unknown): Promise<string | null> => {
      cancel()
      const controller = new AbortController()
      controllerRef.current = controller
      const isCurrent = (): boolean => controllerRef.current === controller
      const signal = AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(STREAM_TIMEOUT_MS),
      ])

      setText("")
      setError(null)
      setStatus("streaming")

      let latestText = ""
      pendingTextRef.current = ""
      try {
        const finalText = await requestTextStream(
          endpoint,
          body,
          signal,
          (next) => {
            if (!isCurrent()) return
            latestText = next
            pendingTextRef.current = next
            // Markdown rendering is expensive; coalesce tokens to one update per
            // frame, then always flush the complete response below.
            if (frameRef.current === null) {
              frameRef.current = requestAnimationFrame(() => {
                frameRef.current = null
                if (isCurrent()) setText(latestText)
              })
            }
          }
        )
        if (!isCurrent()) return null
        setText(finalText)
        setStatus("done")
        return finalText
      } catch (err) {
        if (!isCurrent() || controller.signal.aborted) return null
        setText(latestText)
        setError(errorMessage(err))
        setStatus("error")
        return null
      } finally {
        // A superseded request must not cancel the newer request's frame.
        if (isCurrent()) cancel()
      }
    },
    [endpoint, cancel]
  )

  useEffect(() => cancel, [cancel])

  return { text, status, error, run, stop, reset }
}
