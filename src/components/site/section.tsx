import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SectionProps = {
  id: string
  children: ReactNode
  /** subtle raised background to alternate rhythm between sections */
  tinted?: boolean
  className?: string
}

export function Section({ id, children, tinted = false, className }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-16 border-t border-border/60 py-12 md:py-16",
        tinted && "bg-muted/50",
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">{children}</div>
    </section>
  )
}
