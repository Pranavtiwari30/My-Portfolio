import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Reveal } from "./reveal"

type SectionHeadingProps = {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <Reveal className={cn("mb-10 max-w-2xl md:mb-14", className)}>
      <div className="mb-3 flex items-center gap-3">
        <span className="h-px w-8 bg-brand" />
        <span className="font-mono text-xs tracking-widest text-brand uppercase">
          {eyebrow}
        </span>
      </div>
      <h2 className="text-3xl font-semibold text-balance sm:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-4 text-base text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
    </Reveal>
  )
}
