import { useMemo, useState } from "react"
import { Check, Copy, Mail, RotateCcw, Sparkles, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { profile } from "@/lib/portfolio-data"
import { copyToClipboard, extractEmailDraft, mailtoLink } from "@/lib/parse"
import { useTextStream } from "@/lib/use-text-stream"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { PromptBox } from "./prompt-box"

type ChatMessage = { id: string; role: "user" | "assistant"; content: string }

const STARTERS = [
  "I'd like to hire you for an AI engineering role",
  "Collaborate on a RAG project",
  "Ask about the GPU benchmarking work",
  "Freelance / contract inquiry",
]

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const wire = (messages: ChatMessage[]) =>
  messages.map(({ role, content }) => ({ role, content }))

export function ContactAssistant() {
  // Only completed turns live here; the in-flight assistant reply is `text`.
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [copied, setCopied] = useState(false)
  const { text, status, error, run, stop, reset } = useTextStream("/api/chat")

  const isBusy = status === "streaming"

  async function ask(history: ChatMessage[]) {
    setMessages(history)
    const final = await run({ messages: wire(history) })
    if (final && final.trim()) {
      setMessages([
        ...history,
        { id: uid(), role: "assistant", content: final },
      ])
    }
  }

  function send(userText: string) {
    void ask([...messages, { id: uid(), role: "user", content: userText }])
  }

  function retry() {
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user")
    if (lastUserIndex >= 0) void ask(messages.slice(0, lastUserIndex + 1))
  }

  function resetChat() {
    stop()
    reset()
    setMessages([])
    setCopied(false)
  }

  const draft = useMemo(() => {
    if (isBusy) return null
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant")
    return lastAssistant ? extractEmailDraft(lastAssistant.content) : null
  }, [messages, isBusy])

  async function handleCopy() {
    if (draft && (await copyToClipboard(draft))) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const hasThread = messages.length > 0 || isBusy
  const showStreamingBubble = isBusy && text.length > 0

  return (
    <div className="flex h-[30rem] flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md bg-brand/15 text-brand">
            <Sparkles className="size-3.5" />
          </span>
          <span className="text-sm font-medium">Contact assistant</span>
        </div>
        {hasThread ? (
          <Button
            variant="ghost"
            onClick={resetChat}
            className="h-6 gap-1 px-2 text-xs text-muted-foreground"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        ) : null}
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="gap-5 p-4">
          {!hasThread ? (
            <ConversationEmptyState
              className="h-full"
              icon={<Sparkles className="size-5 text-brand" />}
              title="Draft an intro to Pranav"
              description="Tell me what you're after and I'll help you write a clear message to send."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.role === "assistant" ? (
                    <MessageResponse>{message.content}</MessageResponse>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </MessageContent>
              </Message>
            ))
          )}

          {showStreamingBubble ? (
            <Message from="assistant">
              <MessageContent>
                <MessageResponse>{text}</MessageResponse>
              </MessageContent>
            </Message>
          ) : null}

          {isBusy && text.length === 0 ? (
            <Shimmer className="text-sm">Thinking…</Shimmer>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p>{error}</p>
                <Button
                  variant="outline"
                  onClick={retry}
                  className="h-6 px-2 text-xs"
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {draft ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-brand/5 px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Draft ready —</span>
          <Button
            variant="outline"
            onClick={handleCopy}
            className="h-7 gap-1 px-2.5 text-xs"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <a
            href={mailtoLink(
              profile.email,
              "Reaching out via your portfolio",
              draft
            )}
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-7 gap-1 px-2.5 text-xs"
            )}
          >
            <Mail className="size-3" />
            Open in email
          </a>
        </div>
      ) : null}

      <div className="border-t border-border p-3">
        {!hasThread ? (
          <div className="mb-2.5">
            <Suggestions>
              {STARTERS.map((s) => (
                <Suggestion key={s} suggestion={s} onClick={(t) => send(t)} />
              ))}
            </Suggestions>
          </div>
        ) : null}
        <PromptBox
          onSend={send}
          onStop={stop}
          isStreaming={isBusy}
          placeholder="e.g. I'm hiring for an applied AI role and your RAG work stood out…"
        />
      </div>
    </div>
  )
}
