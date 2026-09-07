import { useEffect, useRef, useState } from "react"
import { Check, Copy, Mail, RefreshCw, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { profile } from "@/lib/portfolio-data"
import { type ContactDraft, isValidEmail, mailtoLink } from "@/lib/parse"
import type { ContactRequest } from "@/lib/validation"
import { errorMessage, postJson, requireContactSuccess } from "@/lib/client-api"
import { useClipboard } from "@/lib/use-clipboard"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type SendState = "idle" | "sending" | "sent" | "error"
const CONTACT_TIMEOUT_MS = 30_000

type ConfirmCardProps = {
  draft: ContactDraft
  transcript: string
  messageCount: number
  onSent: (email: string) => void
}

export function ConfirmCard({
  draft,
  transcript,
  messageCount,
  onSent,
}: ConfirmCardProps) {
  const [name, setName] = useState(draft.name)
  const [email, setEmail] = useState(draft.email)
  const [company, setCompany] = useState("") // honeypot — empty for humans
  const { copied, copy } = useClipboard()
  const [sendState, setSendState] = useState<SendState>("idle")
  const [sendError, setSendError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      abortRef.current?.abort()
      abortRef.current = null
    },
    []
  )

  const emailInvalid = email.length > 0 && !isValidEmail(email)
  const canSend =
    sendState !== "sending" &&
    sendState !== "sent" &&
    name.trim() !== "" &&
    isValidEmail(email)

  async function handleSend(): Promise<void> {
    // State may not have rerendered between two clicks; the ref also gates sends.
    if (!canSend || abortRef.current) return
    const controller = new AbortController()
    abortRef.current = controller
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(CONTACT_TIMEOUT_MS),
    ])
    const request: ContactRequest = {
      name: name.trim(),
      email: email.trim(),
      subject: draft.subject,
      message: draft.body,
      company,
      messageCount,
      transcript,
    }
    setSendState("sending")
    setSendError(null)

    try {
      const response = await postJson("/api/contact", request, signal)
      await requireContactSuccess(response)
      signal.throwIfAborted()
      if (abortRef.current !== controller) return
      setSendState("sent")
      onSent(request.email)
    } catch (error) {
      if (controller.signal.aborted || abortRef.current !== controller) return
      setSendError(errorMessage(error))
      setSendState("error")
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  return (
    <div className="relative space-y-3 border-t border-border bg-brand/5 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">
        Review &amp; send to {profile.firstName}
      </p>

      <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-background/60 p-2.5 text-xs whitespace-pre-wrap">
        <span className="text-muted-foreground">Subject: </span>
        {draft.subject || "Reaching out via your portfolio"}
        {"\n\n"}
        {draft.body}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          className="h-8 text-xs"
        />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          aria-invalid={emailInvalid}
          className="h-8 text-xs"
        />
      </div>
      <p className="text-[0.7rem] text-muted-foreground">
        Your email is used only as the reply-to on this one message.
      </p>

      {/* honeypot — off-screen, not display:none, so bots still fill it */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-[-9999px] h-px w-px overflow-hidden opacity-0"
      >
        <label>
          Company (leave blank)
          <input
            tabIndex={-1}
            autoComplete="off"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
      </div>

      {sendState === "error" && sendError ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{sendError}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleSend}
          disabled={!canSend}
          className="h-8 gap-1.5"
        >
          {sendState === "sending" ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Mail className="size-3.5" />
          )}
          {sendState === "sending"
            ? "Sending…"
            : `Send to ${profile.firstName}`}
        </Button>

        <Button
          variant="outline"
          onClick={() => void copy(draft.body)}
          className="h-8 gap-1 px-2.5 text-xs"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <a
          href={mailtoLink(
            profile.email,
            draft.subject || "Reaching out via your portfolio",
            draft.body
          )}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 gap-1 px-2.5 text-xs"
          )}
        >
          <Mail className="size-3" />
          Open in email
        </a>
      </div>
    </div>
  )
}
