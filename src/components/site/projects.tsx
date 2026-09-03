import { lazy, Suspense, useState } from "react"
import { ArrowUpRight, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Project } from "@/lib/portfolio-data"
import { projects } from "@/lib/portfolio-data"
import { Button, buttonVariants } from "@/components/ui/button"
import { GithubIcon } from "./icons"
import { Section } from "./section"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

const ProjectDeepDive = lazy(() =>
  import("./project-deep-dive").then((m) => ({ default: m.ProjectDeepDive }))
)

function ProjectCard({
  project,
  index,
  featured = false,
}: {
  project: Project
  index: number
  featured?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setEverOpened(true)
  }

  const links = (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="default" onClick={() => handleOpenChange(true)}>
        <Sparkles />
        AI deep dive
      </Button>
      {project.links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground"
          )}
        >
          {link.kind === "repo" ? (
            <GithubIcon className="size-4" />
          ) : (
            <ArrowUpRight className="size-4" />
          )}
          {link.label}
        </a>
      ))}
    </div>
  )

  const highlights = (
    <ul className="space-y-2">
      {project.highlights.map((h) => (
        <li key={h} className="flex gap-2.5 text-sm text-muted-foreground">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-brand" />
          {h}
        </li>
      ))}
    </ul>
  )

  return (
    <Reveal delay={index * 0.06} className="h-full">
      <article
        className={cn(
          "group flex h-full flex-col gap-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10 transition-colors hover:ring-brand/40 md:p-8",
          featured && "lg:flex-row lg:gap-10"
        )}
      >
        <div className={cn("flex flex-1 flex-col", featured && "lg:max-w-xl")}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl font-semibold">
                {project.name}
              </h3>
              <p className="mt-1 text-sm text-brand">{project.tagline}</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground/60">
              0{index + 1}
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {project.description}
          </p>

          <ul className="mt-5 flex flex-wrap gap-1.5">
            {project.tech.map((t) => (
              <li
                key={t}
                className="rounded-md border border-border bg-background/40 px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground"
              >
                {t}
              </li>
            ))}
          </ul>

          {!featured ? (
            <div className="mt-5 border-t border-border/60 pt-5">{highlights}</div>
          ) : null}

          <div className="mt-6 flex-1" />
          {links}
        </div>

        {featured ? (
          <div className="rounded-lg border border-border/60 bg-background/30 p-5 lg:w-72 lg:shrink-0">
            <p className="mb-3 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Highlights
            </p>
            {highlights}
          </div>
        ) : null}
      </article>

      {everOpened ? (
        <Suspense fallback={null}>
          <ProjectDeepDive
            project={project}
            open={open}
            onOpenChange={handleOpenChange}
          />
        </Suspense>
      ) : null}
    </Reveal>
  )
}

export function Projects() {
  return (
    <Section id="projects">
      <SectionHeading
        eyebrow="Projects"
        title="Featured work"
        description="Retrieval systems, predictive ML, and GPU-accelerated inference — each one shipped as a working demo or benchmark. Ask the AI for a deeper look at any of them."
      />

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        {projects.map((project, i) => (
          <div key={project.id} className={i === 0 ? "lg:col-span-2" : undefined}>
            <ProjectCard project={project} index={i} featured={i === 0} />
          </div>
        ))}
      </div>
    </Section>
  )
}
