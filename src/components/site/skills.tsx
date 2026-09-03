import { cn } from "@/lib/utils"
import { skillGroups } from "@/lib/portfolio-data"
import { Section } from "./section"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

export function Skills() {
  return (
    <Section id="skills" tinted>
      <SectionHeading
        eyebrow="Skills"
        title="A technical arsenal built for applied AI"
        description="From certified enterprise backend to modern retrieval-augmented systems — the tools I use to ship intelligent, dependable software."
      />

      <Reveal className="grid gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 sm:grid-cols-2">
        {skillGroups.map((group) => (
          <div key={group.title} className="bg-card p-6 md:p-8">
            <h3 className="mb-4 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {group.title}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <li
                  key={skill.name}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    skill.featured
                      ? "border-brand/40 bg-brand/10 font-medium text-foreground"
                      : "border-border bg-background/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  )}
                >
                  {skill.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Reveal>
    </Section>
  )
}
