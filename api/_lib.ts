import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { RequestError } from "./_request"

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

const provider = createOpenAICompatible({
  name: "portfolio-ai",
  baseURL: AI_BASE_URL,
  apiKey: AI_API_KEY,
})

export function getModel(): ReturnType<typeof provider> {
  return provider(AI_MODEL)
}

export function notConfiguredResponse(): Response {
  return Response.json(
    {
      error:
        "AI features aren't configured on this deployment yet. They light up once an AI_API_KEY environment variable is set.",
    },
    { status: 503 }
  )
}

/**
 * Email delivery for the contact assistant's "Send to Pranav" button.
 * Uses Resend (https://resend.com) over its REST API — no SMTP, edge-safe.
 *
 *   RESEND_API_KEY      required   enables /api/contact; unset -> feature is off
 *   CONTACT_TO_EMAIL    optional   recipient (defaults to profile.email)
 *   CONTACT_FROM_EMAIL  optional   sender  (defaults to the shared Resend sender)
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ""
export const isEmailConfigured = RESEND_API_KEY.trim().length > 0

export function emailNotConfiguredResponse(): Response {
  return Response.json(
    {
      error:
        "Email delivery isn't configured on this deployment yet. It lights up once a RESEND_API_KEY environment variable is set. For now, use the copy or open-in-email options.",
    },
    { status: 503 }
  )
}

export function errorResponse(err: unknown): Response {
  const message =
    err instanceof Error
      ? err.message
      : "Unexpected error talking to the model."
  return Response.json(
    { error: message },
    { status: err instanceof RequestError ? err.status : 502 }
  )
}
