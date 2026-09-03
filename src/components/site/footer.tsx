import { ArrowUp } from "lucide-react"

import { profile, socials } from "@/lib/portfolio-data"
import { GithubIcon, LinkedinIcon } from "./icons"

const ICONS = { mail: null, github: GithubIcon, linkedin: LinkedinIcon } as const

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="font-heading text-sm font-semibold">{profile.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            © {year} · {profile.role}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {socials.map((social) => {
            const Icon = ICONS[social.icon]
            if (!Icon) return null
            return (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon className="size-4" />
              </a>
            )
          })}
          <a
            href="#top"
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to top
            <ArrowUp className="size-3.5" />
          </a>
        </div>
      </div>

      <div className="border-t border-border/60 py-4">
        <p className="mx-auto max-w-6xl px-5 text-center text-xs text-muted-foreground/70 sm:px-8">
          Built with React, Vite, Tailwind &amp; shadcn/ui · AI features powered
          by the Vercel AI SDK
        </p>
      </div>
    </footer>
  )
}
