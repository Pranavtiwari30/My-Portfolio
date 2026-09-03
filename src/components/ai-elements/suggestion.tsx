"use client"

import type { ComponentProps } from "react"
import { useCallback } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type SuggestionsProps = ComponentProps<"div">

export const Suggestions = ({ className, children, ...props }: SuggestionsProps) => (
  <div className={cn("flex flex-wrap items-center gap-2", className)} {...props}>
    {children}
  </div>
)

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string
  onClick?: (suggestion: string) => void
}

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = useCallback(() => {
    onClick?.(suggestion)
  }, [onClick, suggestion])

  return (
    <Button
      className={cn("h-auto rounded-full px-3 py-1 text-xs whitespace-normal", className)}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children || suggestion}
    </Button>
  )
}
