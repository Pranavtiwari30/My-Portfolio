import { useCallback, useRef } from "react"
import { ArrowRight, BadgeCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { profile, socials } from "@/lib/portfolio-data"
import { buttonVariants } from "@/components/ui/button"
import { GithubIcon, LinkedinIcon } from "./icons"

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`)
    el.style.setProperty("--my", `${e.clientY - rect.top}px`)
  }, [])

  const github = socials.find((s) => s.icon === "github")
  const linkedin = socials.find((s) => s.icon === "linkedin")

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={onPointerMove}
      className="group relative flex min-h-[86svh] items-center overflow-hidden pt-16"
    >
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/4 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--brand) 26%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:block"
        style={{
          background:
            "radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklch, var(--brand) 13%, transparent), transparent 65%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand/70" />
              <span className="relative inline-flex size-2 rounded-full bg-brand" />
            </span>
            Open to AI &amp; backend engineering roles and collaborations
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            <BadgeCheck className="size-3.5 text-brand" />
            Certified SAP ABAP Developer
          </span>
        </div>

        <h1 className="font-heading text-5xl font-semibold tracking-tight sm:text-7xl lg:text-[5.5rem]">
          <span className="mb-1 block text-2xl font-medium text-muted-foreground/80 sm:text-3xl">
            Hello, I&apos;m
          </span>
          {profile.firstName}{" "}
          <span className="text-gradient">{profile.lastName}</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground sm:text-xl">
          {profile.tagline}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#projects" className={cn(buttonVariants({ size: "lg" }))}>
            View projects
            <ArrowRight />
          </a>
          <a
            href="#contact"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Get in touch
          </a>
          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
          {github ? (
            <a
              href={github.href}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-lg" }),
                "text-muted-foreground"
              )}
            >
              <GithubIcon className="size-5" />
            </a>
          ) : null}
          {linkedin ? (
            <a
              href={linkedin.href}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-lg" }),
                "text-muted-foreground"
              )}
            >
              <LinkedinIcon className="size-5" />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}
