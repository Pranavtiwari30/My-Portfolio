import type { ReactNode } from "react"

import { about } from "@/lib/portfolio-data"
import { Section } from "./section"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

function emphasize(text: string): ReactNode[] {
  return text.split("**").map((chunk, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {chunk}
      </strong>
    ) : (
      <span key={i}>{chunk}</span>
    )
  )
}

export function About() {
  return (
    <Section id="about">
      <SectionHeading eyebrow="About" title={about.headline} />

      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:gap-14">
        <Reveal className="space-y-5 text-base leading-relaxed text-muted-foreground">
          {about.paragraphs.map((p, i) => (
            <p key={i}>{emphasize(p)}</p>
          ))}
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <div className="mb-5 font-mono text-xs text-muted-foreground">
              <span className="text-brand">const</span> engineer = {"{"}
            </div>
            <dl className="space-y-4">
              {about.facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-0.5">
                  <dt className="font-mono text-xs tracking-wide text-muted-foreground">
                    {fact.label}
                  </dt>
                  <dd className="text-sm font-medium">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 font-mono text-xs text-muted-foreground">{"}"}</div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
