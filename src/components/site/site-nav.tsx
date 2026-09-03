import { useEffect, useState } from "react"
import { ArrowUpRight, Menu, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { nav, profile } from "@/lib/portfolio-data"
import { Button, buttonVariants } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled || open
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          className="group flex items-center gap-2 font-heading text-sm font-semibold tracking-tight"
          onClick={() => setOpen(false)}
        >
          <span className="grid size-7 place-items-center rounded-md bg-brand text-[0.7rem] font-bold text-brand-foreground">
            {profile.initials}
          </span>
          <span className="hidden sm:inline">{profile.name}</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <a
            href="#contact"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden md:inline-flex"
            )}
          >
            Get in touch
            <ArrowUpRight />
          </a>
          <Button
            className="md:hidden"
            size="icon-sm"
            variant="ghost"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background px-5 pt-2 pb-6 sm:px-8 md:hidden">
          <nav className="flex flex-col">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-border/60 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ size: "sm" }), "mt-4 w-full")}
          >
            Get in touch
            <ArrowUpRight />
          </a>
        </div>
      ) : null}
    </header>
  )
}
