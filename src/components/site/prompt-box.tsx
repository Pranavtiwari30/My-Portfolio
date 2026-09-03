import { useState } from "react"
import { ArrowUp, Square } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type PromptBoxProps = {
  onSend: (text: string) => void
  onStop?: () => void
  isStreaming?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function PromptBox({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = "Type a message…",
  className,
}: PromptBoxProps) {
  const [value, setValue] = useState("")

  function submit() {
    const text = value.trim()
    if (!text || disabled || isStreaming) return
    onSend(text)
    setValue("")
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className={cn(
        "flex items-end gap-2 rounded-xl border border-input bg-background/60 p-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className
      )}
    >
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        rows={1}
        disabled={disabled}
        placeholder={placeholder}
        className="max-h-40 min-h-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
      />
      {isStreaming ? (
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          onClick={onStop}
          aria-label="Stop generating"
        >
          <Square className="fill-current" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon-sm"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <ArrowUp />
        </Button>
      )}
    </form>
  )
}
