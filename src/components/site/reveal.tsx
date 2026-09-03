import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type RevealProps = {
  children: ReactNode
  className?: string
  /** seconds */
  delay?: number
  y?: number
}

/** Fade + rise into view once, on an IntersectionObserver. No animation lib. */
export function Reveal({ children, className, delay = 0, y = 14 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    // Already in (or very near) the viewport on mount — show immediately, no
    // animation. Covers first paint, hash-link landings and fast scrolls.
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight || 0
    if (reduce || (rect.top < vh * 0.92 && rect.bottom > 0)) {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    )
    observer.observe(el)

    // Safety net: never leave content hidden.
    const timeout = window.setTimeout(() => setShown(true), 1400)

    return () => {
      observer.disconnect()
      window.clearTimeout(timeout)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
        className
      )}
      style={{
        transitionDelay: `${delay}s`,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
      }}
    >
      {children}
    </div>
  )
}
