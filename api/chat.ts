import { type ModelMessage, smoothStream, streamText } from "ai"
import { contactAssistantSystem } from "../src/lib/ai-context"
import {
  errorResponse,
  getModel,
  isAIConfigured,
  notConfiguredResponse,
} from "./_lib"

export const config = { runtime: "edge" }

const ROLES = new Set(["user", "assistant"])
const MAX_MESSAGES = 24
const MAX_CHARS = 4000

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }
  if (!isAIConfigured) {
    return notConfiguredResponse()
  }

  try {
    const body = (await req.json()) as {
      messages?: { role?: string; content?: string }[]
    }

    const messages: ModelMessage[] = (body.messages ?? [])
      .filter((m) => ROLES.has(m.role ?? "") && typeof m.content === "string")
      .slice(-MAX_MESSAGES)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: (m.content ?? "").slice(0, MAX_CHARS),
      }))

    if (messages.length === 0) {
      return Response.json({ error: "No message provided." }, { status: 400 })
    }

    const result = streamText({
      model: getModel(),
      system: contactAssistantSystem,
      messages,
      temperature: 0.5,
      maxOutputTokens: 900,
      abortSignal: req.signal,
      experimental_transform: smoothStream({ chunking: "word" }),
    })

    return result.toTextStreamResponse()
  } catch (err) {
    return errorResponse(err)
  }
}
