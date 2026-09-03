import { MorphIcon } from "morphicons/react"
import { Moon, Sun } from "lucide"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const isDark = theme === "dark"
  const next = isDark ? "light" : "dark"

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(next)}
      aria-label={`${isDark ? "Dark" : "Light"} theme. Switch to ${next} theme`}
      title={`${isDark ? "Dark" : "Light"} theme`}
    >
      <MorphIcon
        icon={isDark ? Moon : Sun}
        spring="snappy"
        reducedMotion="user"
        className="size-4"
      />
    </Button>
  )
}
