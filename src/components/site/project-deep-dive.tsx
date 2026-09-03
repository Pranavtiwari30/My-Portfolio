import { useEffect, useState } from "react"
import { Check, Copy, RefreshCw, Sparkles, TriangleAlert } from "lucide-react"

import type { Project } from "@/lib/portfolio-data"
import { copyToClipboard } from "@/lib/parse"
import { useTextStream } from "@/lib/use-text-stream"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessageResponse } from "@/components/ai-elements/message"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import { Shimmer } from "@/components/ai-elements/shimmer"

const ANGLES = [
  { id: "architecture", label: "Architecture" },
  { id: "why-it-matters", label: "Why it matters" },
  { id: "tradeoffs", label: "Tradeoffs" },
  { id: "how-built", label: "How it's built" },
] as const

type AngleId = (typeof ANGLES)[number]["id"]

export function ProjectDeepDive({
  project,
  open,
  onOpenChange,
}: {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [angle, setAngle] = useState<AngleId>("architecture")
  const [copied, setCopied] = useState(false)
  const { text, status, error, run, stop } = useTextStream("/api/deep-dive")

  const isLoading = status === "streaming"

  function generate(next: AngleId) {
    setAngle(next)
    setCopied(false)
    void run({ project: project.name, angle: next })
  }

  // Kick off the first pass when the dialog opens; stop the stream on close.
  useEffect(() => {
    if (open) {
      if (status === "idle") {
        void run({ project: project.name, angle: "architecture" })
      }
    } else {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleCopy() {
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border p-5">
          <div className="flex items-center gap-2 text-brand">
            <Sparkles className="size-4" />
            <span className="font-mono text-xs tracking-widest uppercase">
              AI deep dive
            </span>
          </div>
          <DialogTitle className="text-lg">{project.name}</DialogTitle>
          <DialogDescription>
            A generated, engineer-to-engineer explanation grounded in this
            project&apos;s summary. Pick an angle:
          </DialogDescription>
          <div className="pt-2">
            <Suggestions>
              {ANGLES.map((a) => (
                <Suggestion
                  key={a.id}
                  suggestion={a.label}
                  onClick={() => !isLoading && generate(a.id)}
                  disabled={isLoading}
                  variant={a.id === angle ? "default" : "outline"}
                />
              ))}
            </Suggestions>
          </div>
        </DialogHeader>

        <div className="max-h-[46vh] min-h-32 overflow-y-auto p-5">
          {error ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : isLoading && !text ? (
            <Shimmer className="text-sm">{`Analysing ${project.name}…`}</Shimmer>
          ) : (
            <MessageResponse>{text}</MessageResponse>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 p-3">
          <p className="text-[0.7rem] text-muted-foreground">
            AI-generated · may contain inferences
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => generate(angle)}
              disabled={isLoading}
            >
              <RefreshCw className={isLoading ? "animate-spin" : undefined} />
              Regenerate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              disabled={!text || isLoading}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
