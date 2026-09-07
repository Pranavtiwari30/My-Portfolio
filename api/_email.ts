import { profile } from "../src/lib/portfolio-data"
import { emailServiceErrorSchema, type ContactData } from "./_schemas"

const EMAIL_FAILURE =
  "The email service rejected the request. Please use the copy option."

type ContactEmail = {
  from: string
  to: string[]
  reply_to: string
  subject: string
  text: string
}

export function buildContactEmail(body: ContactData): ContactEmail {
  const { name, email, message, transcript } = body
  const subject = body.subject || `Portfolio message from ${name}`
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
  return {
    from:
      process.env.CONTACT_FROM_EMAIL ??
      "Portfolio contact <onboarding@resend.dev>",
    to: [process.env.CONTACT_TO_EMAIL ?? profile.email],
    reply_to: email,
    subject,
    text,
  }
}

type RetryPolicy = {
  maxRetries: number
  attemptTimeoutMs: number
  totalTimeoutMs: number
  baseDelayMs: number
}

const DEFAULT_POLICY: RetryPolicy = {
  maxRetries: 2,
  attemptTimeoutMs: 8_000,
  totalTimeoutMs: 25_000,
  baseDelayMs: 250,
}

/** Parse both legal Retry-After forms; never retry earlier than requested. */
export function retryDelay(
  value: string | null,
  fallback: number,
  now = Date.now()
): number {
  if (!value?.trim()) return fallback
  const seconds = Number(value)
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - now
  return Number.isFinite(delay) && delay >= 0 ? delay : fallback
}

export function waitForRetry(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    function onAbort(): void {
      clearTimeout(timer)
      reject(signal.reason)
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

async function emailServiceError(response: Response): Promise<string> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    if (error instanceof SyntaxError) return EMAIL_FAILURE
    throw error
  }
  const parsed = emailServiceErrorSchema.safeParse(payload)
  return parsed.success ? parsed.data.message : EMAIL_FAILURE
}

/** Retry only transient failures, with a single key/body for this send operation. */
export async function sendContactEmail(
  body: ContactData,
  signal: AbortSignal,
  policy: RetryPolicy = DEFAULT_POLICY
): Promise<void> {
  const payload = JSON.stringify(buildContactEmail(body))
  const idempotencyKey = crypto.randomUUID()
  const deadline = new AbortController()
  const totalTimer = setTimeout(
    () =>
      deadline.abort(
        new DOMException("Email delivery timed out.", "TimeoutError")
      ),
    policy.totalTimeoutMs
  )
  const operationSignal = AbortSignal.any([signal, deadline.signal])
  try {
    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      operationSignal.throwIfAborted()
      const timeout = new AbortController()
      const attemptTimer = setTimeout(
        () =>
          timeout.abort(
            new DOMException("Email service timed out.", "TimeoutError")
          ),
        policy.attemptTimeoutMs
      )
      let delay = policy.baseDelayMs * 2 ** attempt * (1 + Math.random())
      let failure: unknown
      let shouldRetry = false
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "content-type": "application/json",
            "idempotency-key": idempotencyKey,
          },
          body: payload,
          signal: AbortSignal.any([operationSignal, timeout.signal]),
        })
        if (response.ok) {
          // Delivery is confirmed by the status; its body isn't used by callers.
          // Cleanup cannot turn an accepted delivery into an error or hang it.
          void response.body?.cancel().catch(() => undefined)
          return
        }
        failure = new Error(await emailServiceError(response))
        shouldRetry =
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        delay = retryDelay(response.headers.get("retry-after"), delay)
      } catch (error) {
        operationSignal.throwIfAborted()
        failure = error
        shouldRetry = timeout.signal.aborted || error instanceof TypeError
      } finally {
        clearTimeout(attemptTimer)
      }
      if (!shouldRetry || attempt === policy.maxRetries) throw failure
      await waitForRetry(delay, operationSignal)
    }
  } finally {
    clearTimeout(totalTimer)
  }
}
