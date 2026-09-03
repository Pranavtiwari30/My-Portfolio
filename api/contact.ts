import { profile } from "../src/lib/portfolio-data"
import {
  emailNotConfiguredResponse,
  errorResponse,
  isEmailConfigured,
} from "./_lib"

export const config = { runtime: "edge" }

/** Loose email check — mirrors EMAIL_RE in src/lib/parse.ts (kept separate so
 *  this edge route doesn't pull the DOM-touching client module into its bundle). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Best-effort in-memory rate limit. Per-isolate only — the real backstops are the
// honeypot, the origin check, the min-conversation gate, and Resend's own quota.
const WINDOW_MS = 10 * 60_000
const MAX_PER_WINDOW = 3
const DAY_MS = 24 * 60 * 60_000
const MAX_PER_DAY = 8
const hits = new Map<string, number[]>()

function rateLimit(ip: string): number | null {
  const now = Date.now()
  if (hits.size > 5000) hits.clear()
  const all = (hits.get(ip) ?? []).filter((t) => now - t < DAY_MS)
  const win = all.filter((t) => now - t < WINDOW_MS)
  if (all.length >= MAX_PER_DAY) return DAY_MS - (now - (all[0] ?? now))
  if (win.length >= MAX_PER_WINDOW) return WINDOW_MS - (now - (win[0] ?? now))
  all.push(now)
  hits.set(ip, all)
  return null
}

function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")
  if (real) return real.trim()
  const xff = req.headers.get("x-forwarded-for")
  return xff ? (xff.split(",")[0] ?? "unknown").trim() : "unknown"
}

const oneLine = (v: unknown, max: number) =>
  typeof v === "string"
    ? v
        .replace(/[\r\n]+/g, " ")
        .trim()
        .slice(0, max)
    : ""

const bad = (error: string) => Response.json({ error }, { status: 400 })

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }
  if (!isEmailConfigured) {
    return emailNotConfiguredResponse()
  }

  // Reject cross-origin POSTs (a form on another site pointed at this route).
  const origin = req.headers.get("origin")
  const host = req.headers.get("host")
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return Response.json(
          { error: "Cross-origin request rejected." },
          { status: 403 }
        )
      }
    } catch {
      // malformed Origin header — ignore and continue
    }
  }

  const raw = await req.text()
  if (raw.length > 16_000) {
    return Response.json({ error: "Payload too large." }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  // Honeypot — real visitors never fill this. Pretend it worked, send nothing.
  if (oneLine(body.company, 200)) {
    return Response.json({ ok: true })
  }

  const name = oneLine(body.name, 100)
  const email = oneLine(body.email, 254).toLowerCase()
  const subjectIn = oneLine(body.subject, 150)
  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 5000) : ""
  const transcript =
    typeof body.transcript === "string" ? body.transcript.slice(0, 4000) : ""
  const messageCount =
    typeof body.messageCount === "number" ? body.messageCount : 0

  if (!name) return bad("Please include your name.")
  if (email.length < 3 || !EMAIL_RE.test(email)) {
    return bad("A valid reply-to email is required.")
  }
  if (message.length < 20) {
    return bad("The message looks too short — add a sentence or two.")
  }
  if (messageCount < 2) {
    return bad("Chat with the assistant a little first, then send.")
  }

  const retryMs = rateLimit(clientIp(req))
  if (retryMs != null) {
    return new Response(
      JSON.stringify({
        error: "Too many messages from here — try again later.",
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(Math.ceil(retryMs / 1000)),
        },
      }
    )
  }

  const subject = subjectIn || `Portfolio message from ${name}`
  const text = [
    "New message via the portfolio contact assistant.",
    "",
    `From:    ${name} <${email}>`,
    `Subject: ${subject}`,
    "",
    "----------------------------------------",
    message,
    "----------------------------------------",
    ...(transcript ? ["", "Conversation so far:", transcript] : []),
    "",
    `Reply directly to this email to reach ${name}.`,
  ].join("\n")

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.CONTACT_FROM_EMAIL ??
          "Portfolio contact <onboarding@resend.dev>",
        to: [process.env.CONTACT_TO_EMAIL ?? profile.email],
        reply_to: email,
        subject,
        text,
      }),
    })

    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as {
        message?: string
      } | null
      return Response.json(
        {
          error:
            detail?.message ??
            "The email service rejected the request. Please use the copy option.",
        },
        { status: 502 }
      )
    }

    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
