"use client"

import { cn } from "@/lib/utils"

export type ShimmerProps = {
  children: string
  className?: string
}

/** Animated shimmering text, used as a lightweight "thinking" indicator. */
export function Shimmer({ children, className }: ShimmerProps) {
  return (
    <span className={cn("shimmer-text", className)} aria-live="polite">
      {children}
    </span>
  )
}
