import { useEffect, useRef, useState, type ReactNode } from "react"

type LazyVisibleProps = {
  children: ReactNode
  fallback?: ReactNode
  /** how far outside the viewport to start loading */
  rootMargin?: string
  className?: string
}

/** Renders `children` only once the placeholder scrolls near the viewport. */
export function LazyVisible({
  children,
  fallback = null,
  rootMargin = "400px",
  className,
}: LazyVisibleProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  return (
    <div ref={ref} className={className}>
      {visible ? children : fallback}
    </div>
  )
}
