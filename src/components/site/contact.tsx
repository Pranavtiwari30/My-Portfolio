import { lazy, Suspense } from "react"
import { ArrowUpRight, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { contact, profile, socials } from "@/lib/portfolio-data"
import { buttonVariants } from "@/components/ui/button"
import { GithubIcon, LinkedinIcon } from "./icons"
import { Section } from "./section"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"
import { LazyVisible } from "./lazy-visible"

const ContactAssistant = lazy(() =>
  import("./contact-assistant").then((m) => ({ default: m.ContactAssistant }))
)

function AssistantSkeleton() {
  return (
    <div className="flex h-[30rem] flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="grid size-6 place-items-center rounded-md bg-brand/15 text-brand">
          <Sparkles className="size-3.5" />
        </span>
        <span className="text-sm font-medium">Contact assistant</span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading assistant…</span>
      </div>
    </div>
  )
}

const ICONS = {
  mail: ArrowUpRight,
  github: GithubIcon,
  linkedin: LinkedinIcon,
} as const

export function Contact() {
  return (
    <Section id="contact" tinted>
      <SectionHeading
        eyebrow="Contact"
        title={contact.headline}
        description={contact.subhead}
      />

      <div className="grid gap-10 md:grid-cols-2 md:gap-12 lg:grid-cols-[0.85fr_1fr]">
        <Reveal className="flex min-w-0 flex-col">
          <a
            href={`mailto:${profile.email}`}
            className="group font-heading text-lg font-medium break-words transition-colors hover:text-brand sm:text-xl"
          >
            {profile.email}
            <ArrowUpRight className="ml-1 inline size-4 -translate-y-0.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>

          <div className="mt-8 flex flex-col gap-2">
            {socials.map((social) => {
              const Icon = ICONS[social.icon]
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.icon === "mail" ? undefined : "_blank"}
                  rel="noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 text-sm transition-colors hover:border-brand/40 hover:bg-card"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
                    <span className="font-medium">{social.label}</span>
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {social.handle}
                  </span>
                </a>
              )
            })}
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Prefer the direct route? The email above works just as well — the
            assistant is only here to make the first message easier to write.
          </p>

          <a
            href={socials.find((s) => s.icon === "github")?.href ?? "#"}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-6 w-fit"
            )}
          >
            <GithubIcon className="size-4" />
            See more on GitHub
          </a>
        </Reveal>

        <Reveal delay={0.1} className="min-w-0">
          <LazyVisible fallback={<AssistantSkeleton />}>
            <Suspense fallback={<AssistantSkeleton />}>
              <ContactAssistant />
            </Suspense>
          </LazyVisible>
        </Reveal>
      </div>
    </Section>
  )
}
