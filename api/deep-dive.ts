import { smoothStream, streamText } from "ai"
import { deepDiveSystem } from "../src/lib/ai-context"
import {
  errorResponse,
  getModel,
  isAIConfigured,
  notConfiguredResponse,
} from "./_lib"

export const config = { runtime: "edge" }

const ALLOWED_ANGLES = new Set([
  "architecture",
  "why-it-matters",
  "tradeoffs",
  "how-built",
])

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }
  if (!isAIConfigured) {
    return notConfiguredResponse()
  }

  try {
    // useCompletion always posts a `prompt` field; this route ignores it and
    // drives generation from the structured { project, angle } instead.
    const body = (await req.json()) as { project?: string; angle?: string }
    const project = (body.project ?? "").slice(0, 120)
    const angle = ALLOWED_ANGLES.has(body.angle ?? "")
      ? (body.angle as string)
      : "architecture"

    const question =
      {
        architecture: "Walk through the likely architecture of this project end to end.",
        "why-it-matters": "Explain why this project matters and what problem it really solves.",
        tradeoffs: "What are the key engineering tradeoffs and constraints in this project?",
        "how-built": "How was this project most likely built, step by step?",
      }[angle] ?? "Explain this project in more depth."

    const result = streamText({
      model: getModel(),
      system: deepDiveSystem(project),
      prompt: `${question}\n\nProject: ${project}`,
      temperature: 0.4,
      maxOutputTokens: 700,
      abortSignal: req.signal,
      experimental_transform: smoothStream({ chunking: "word" }),
    })

    return result.toTextStreamResponse()
  } catch (err) {
    return errorResponse(err)
  }
}
