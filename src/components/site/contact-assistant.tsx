import { useMemo, useState } from "react"
import { Check, RotateCcw, Sparkles, TriangleAlert } from "lucide-react"

import { profile } from "@/lib/portfolio-data"
import { extractContactDraft } from "@/lib/parse"
import { useTextStream } from "@/lib/use-text-stream"
import { Button } from "@/components/ui/button"
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
import { ConfirmCard } from "./contact-confirm-card"

type ChatMessage = { id: string; role: "user" | "assistant"; content: string }

const STARTERS = [
  "I'd like to hire you for an AI engineering role",
  "Collaborate on a RAG project",
  "Ask about the GPU benchmarking work",
  "Freelance / contract inquiry",
]

const uid = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const wire = (
  messages: readonly ChatMessage[]
): Pick<ChatMessage, "role" | "content">[] =>
  messages.map(({ role, content }) => ({ role, content }))

export function ContactAssistant() {
  // Only completed turns live here; the in-flight assistant reply is `text`.
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { text, status, error, run, stop, reset } = useTextStream("/api/chat")

  const isBusy = status === "streaming"

  async function ask(history: ChatMessage[]): Promise<void> {
    setMessages(history)
    const final = await run({ messages: wire(history) })
    if (final && final.trim()) {
      setMessages([
        ...history,
        { id: uid(), role: "assistant", content: final },
      ])
    }
  }

  function send(userText: string): void {
    void ask([...messages, { id: uid(), role: "user", content: userText }])
  }

  function retry(): void {
    const lastUserIndex = messages.findLastIndex(
      (message) => message.role === "user"
    )
    if (lastUserIndex >= 0) void ask(messages.slice(0, lastUserIndex + 1))
  }

  function resetChat(): void {
    reset()
    setMessages([])
    setSentTo(null)
  }

  // The confirm card is keyed to the newest assistant message, so a re-draft
  // remounts it with fresh form state (no setState-in-effect needed).
  const { draft, draftKey, userTurns, transcript } = useMemo(() => {
    const last = messages.findLast((message) => message.role === "assistant")
    return {
      draft: last ? extractContactDraft(last.content) : null,
      draftKey: last?.id ?? null,
      userTurns: messages.filter((message) => message.role === "user").length,
      transcript: messages
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n\n")
        .slice(0, 4000),
    }
  }, [messages])

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
              description="Tell me what you're after and I'll help you write a clear message — then send it to Pranav right here."
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

      {draft && !isBusy && !sentTo ? (
        <ConfirmCard
          key={draftKey}
          draft={draft}
          transcript={transcript}
          messageCount={userTurns}
          onSent={setSentTo}
        />
      ) : null}

      {sentTo ? (
        <div className="flex items-center gap-2 border-t border-border bg-brand/5 px-4 py-3 text-sm">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
            <Check className="size-3" />
          </span>
          <span>
            Sent to {profile.firstName}. He&apos;ll reply to{" "}
            <span className="font-medium">{sentTo}</span>.
          </span>
          <Button
            variant="ghost"
            onClick={resetChat}
            className="ml-auto h-6 px-2 text-xs"
          >
            Start over
          </Button>
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
          disabled={sentTo !== null}
          placeholder="e.g. I'm hiring for an applied AI role and your RAG work stood out…"
        />
      </div>
    </div>
  )
}
