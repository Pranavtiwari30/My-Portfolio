import { sendContactEmail } from "./_email"
import {
  emailNotConfiguredResponse,
  errorResponse,
  isEmailConfigured,
} from "./_lib"
import { clientIp, contactRateLimiter } from "./_rate-limit"
import { readJson } from "./_request"
import { contactRequestSchema } from "./_schemas"

export const config = { runtime: "edge" }

function isCrossOrigin(req: Request): boolean {
  const origin = req.headers.get("origin")
  const host = req.headers.get("host")
  if (!origin || !host) return false
  try {
    return new URL(origin).host !== host
  } catch {
    return true
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }
  if (!isEmailConfigured) return emailNotConfiguredResponse()
  if (isCrossOrigin(req)) {
    return Response.json(
      { error: "Cross-origin request rejected." },
      { status: 403 }
    )
  }

  try {
    const body = await readJson(req, contactRequestSchema, 16_000)
    // Honeypot: acknowledge bots without consuming quota or sending mail.
    if (body.company) return Response.json({ ok: true })

    const retryMs = contactRateLimiter.check(clientIp(req))
    if (retryMs !== null) {
      return Response.json(
        { error: "Too many messages from here — try again later." },
        {
          status: 429,
          headers: { "retry-after": String(Math.ceil(retryMs / 1000)) },
        }
      )
    }
    await sendContactEmail(body, req.signal)
    return Response.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
