import { z } from "zod"
import { DEEP_DIVE_ANGLES } from "../src/lib/deep-dive"
import { isValidEmail } from "../src/lib/validation"

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().transform((content) => content.slice(0, 4000)),
})

// Preserve the public contract: ignore unsupported messages before keeping the
// last 24. Unknown object keys are stripped; field types are never coerced.
export const chatRequestSchema = z.object({
  messages: z
    .array(z.unknown())
    .nullish()
    .transform((messages) => recentChatMessages(messages ?? [])),
})

function recentChatMessages(
  messages: unknown[]
): z.infer<typeof chatMessageSchema>[] {
  const recent: z.infer<typeof chatMessageSchema>[] = []
  for (
    let index = messages.length - 1;
    index >= 0 && recent.length < 24;
    index--
  ) {
    const parsed = chatMessageSchema.safeParse(messages[index])
    if (parsed.success) recent.push(parsed.data)
  }
  return recent.reverse()
}

export const deepDiveRequestSchema = z.object({
  project: z
    .string()
    .nullish()
    .transform((project) => (project ?? "").slice(0, 120)),
  angle: z.enum(DEEP_DIVE_ANGLES.map(({ id }) => id)).catch("architecture"),
})

function singleLine(maxLength: number) {
  return z
    .string()
    .catch("")
    .transform((value) =>
      value
        .replace(/[\r\n]+/g, " ")
        .trim()
        .slice(0, maxLength)
    )
}

// Legacy contact fields deliberately default to empty strings instead of
// coercing numbers/objects. Keep normalization and its limits before checks.
export const contactRequestSchema = z
  .object({
    company: singleLine(200),
    name: singleLine(100),
    email: singleLine(254).transform((email) => email.toLowerCase()),
    subject: singleLine(150),
    message: z
      .string()
      .catch("")
      .transform((message) => message.trim().slice(0, 5000)),
    transcript: z
      .string()
      .catch("")
      .transform((transcript) => transcript.slice(0, 4000)),
    messageCount: z.number().catch(0),
  })
  .superRefine((body, context) => {
    if (body.company) return
    const error = contactValidationError(body)
    if (error) context.addIssue({ code: "custom", message: error })
  })

export type ContactData = z.infer<typeof contactRequestSchema>
export const emailServiceErrorSchema = z.object({ message: z.string() })

function contactValidationError(body: ContactData): string | null {
  if (!body.name) return "Please include your name."
  if (!isValidEmail(body.email)) return "A valid reply-to email is required."
  if (body.message.length < 20)
    return "The message looks too short — add a sentence or two."
  if (body.messageCount < 2)
    return "Chat with the assistant a little first, then send."
  return null
}
