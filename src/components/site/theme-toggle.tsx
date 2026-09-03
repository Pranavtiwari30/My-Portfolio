import { Monitor, Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

const ORDER = ["system", "light", "dark"] as const
const LABEL = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
} as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const current = ORDER.includes(theme as (typeof ORDER)[number])
    ? (theme as (typeof ORDER)[number])
    : "system"

  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
  const Icon = current === "system" ? Monitor : current === "light" ? Sun : Moon

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(next)}
      aria-label={`${LABEL[current]}. Switch to ${LABEL[next].toLowerCase()}`}
      title={LABEL[current]}
    >
      <Icon />
    </Button>
  )
}
