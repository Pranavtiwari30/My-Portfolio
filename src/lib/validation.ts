import * as z from "zod/mini"

/** Shared, DOM-free validation for browser and Edge API consumers. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  const email = value.trim()
  return email.length >= 3 && email.length <= 254 && EMAIL_RE.test(email)
}

export const errorResponseSchema = z.object({ error: z.string() })
export const contactResponseSchema = z.object({ ok: z.literal(true) })

export const contactSubmissionSchema = z.object({
  name: z.string(),
  email: z.string(),
  subject: z.string(),
  message: z.string(),
  transcript: z.string(),
  messageCount: z.number(),
  company: z.string(),
})

export type ContactRequest = z.infer<typeof contactSubmissionSchema>
