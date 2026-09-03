import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

/**
 * Provider wiring for the portfolio's AI features.
 *
 * Works with any OpenAI-compatible endpoint. Configure in the environment
 * (Vercel Project Settings -> Environment Variables, or .env.local for dev):
 *
 *   AI_API_KEY    required   the API key for your provider
 *   AI_BASE_URL   optional   defaults to https://api.openai.com/v1
 *                            e.g. https://api.groq.com/openai/v1
 *                                 https://openrouter.ai/api/v1
 *                                 https://ai-gateway.vercel.sh/v1
 *   AI_MODEL      optional   defaults to gpt-4o-mini
 *                            e.g. llama-3.3-70b-versatile, gpt-4o-mini, ...
 */
const AI_API_KEY = process.env.AI_API_KEY ?? ""
const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://api.openai.com/v1"

export const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini"
export const isAIConfigured = AI_API_KEY.trim().length > 0

export function getModel() {
  const provider = createOpenAICompatible({
    name: "portfolio-ai",
    baseURL: AI_BASE_URL,
    apiKey: AI_API_KEY,
  })
  return provider(AI_MODEL)
}

export function notConfiguredResponse() {
  return Response.json(
    {
      error:
        "AI features aren't configured on this deployment yet. They light up once an AI_API_KEY environment variable is set.",
    },
    { status: 503 }
  )
}

export function errorResponse(err: unknown) {
  const message =
    err instanceof Error ? err.message : "Unexpected error talking to the model."
  return Response.json({ error: message }, { status: 502 })
}
