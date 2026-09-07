import { contactAssistantSystem } from "../src/lib/ai-context"
import { createAIResponse } from "./_ai"
import { errorResponse, isAIConfigured, notConfiguredResponse } from "./_lib"
import { readJson } from "./_request"
import { chatRequestSchema } from "./_schemas"

export const config = { runtime: "edge" }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }
  if (!isAIConfigured) return notConfiguredResponse()

  try {
    const { messages } = await readJson(req, chatRequestSchema)
    if (messages.length === 0) {
      return Response.json({ error: "No message provided." }, { status: 400 })
    }
    return await createAIResponse(req, {
      system: contactAssistantSystem,
      messages,
      temperature: 0.5,
      maxOutputTokens: 900,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
