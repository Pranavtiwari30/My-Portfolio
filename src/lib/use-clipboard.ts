import { useCallback, useEffect, useRef, useState } from "react"

import { copyToClipboard } from "./parse"

type Clipboard = {
  copied: boolean
  copy: (text: string) => Promise<void>
  resetCopied: () => void
}

/** Shared copy feedback, with stale writes and timers cancelled on reset. */
export function useClipboard(): Clipboard {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const versionRef = useRef(0)

  const clearFeedback = useCallback((): void => {
    versionRef.current += 1
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearFeedback, [clearFeedback])

  const resetCopied = useCallback((): void => {
    clearFeedback()
    setCopied(false)
  }, [clearFeedback])

  const copy = useCallback(async (text: string): Promise<void> => {
    const version = ++versionRef.current
    if (!(await copyToClipboard(text)) || version !== versionRef.current) return
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    setCopied(true)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setCopied(false)
    }, 2000)
  }, [])

  return { copied, copy, resetCopied }
}
