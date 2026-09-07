import { deepDiveSystem } from "../src/lib/ai-context"
import { DEEP_DIVE_ANGLES } from "../src/lib/deep-dive"
import { createAIResponse } from "./_ai"
import { errorResponse, isAIConfigured, notConfiguredResponse } from "./_lib"
import { readJson } from "./_request"
import { deepDiveRequestSchema } from "./_schemas"

export const config = { runtime: "edge" }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }
  if (!isAIConfigured) return notConfiguredResponse()

  try {
    const { project, angle } = await readJson(req, deepDiveRequestSchema)
    const { question } =
      DEEP_DIVE_ANGLES.find(({ id }) => id === angle) ?? DEEP_DIVE_ANGLES[0]
    return await createAIResponse(req, {
      system: deepDiveSystem(project),
      prompt: `${question}\n\nProject: ${project}`,
      temperature: 0.4,
      maxOutputTokens: 700,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
