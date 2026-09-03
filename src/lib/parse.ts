/** Loose email check — catches typos, not a full RFC validator. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  const v = value.trim()
  return v.length >= 3 && v.length <= 254 && EMAIL_RE.test(v)
}

export type ContactDraft = {
  /** Visitor display name, or "" if the model didn't supply a real one. */
  name: string
  /** Visitor reply-to email, lowercased, or "" if missing / not valid. */
  email: string
  /** Subject line, or "" to fall back to a default. */
  subject: string
  /** The message body addressed to Pranav, pseudo-headers stripped. */
  body: string
}

const HEADER_RE = /^\s*(from|reply-to|name|email|subject)\s*:\s*(.+?)\s*$/i
const ANGLE_EMAIL_RE = /<\s*([^<>@\s]+@[^<>@\s]+)\s*>/
const BARE_EMAIL_RE = /[^\s<>()]+@[^\s<>()]+\.[^\s<>()]+/

/**
 * Pull a structured outreach draft from an assistant message. The assistant is
 * told to emit a single fenced ```email block with optional From:/Subject:
 * pseudo-headers, a blank line, then the body. Every field degrades to "" so
 * the confirm UI can let the visitor fill it in.
 */
export function extractContactDraft(markdown: string): ContactDraft | null {
  const block = markdown.match(/```email\s*\n([\s\S]*?)```/i)?.[1]
  if (!block) return null

  const lines = block.replace(/\r\n/g, "\n").split("\n")
  let name = ""
  let email = ""
  let subject = ""
  let i = 0

  for (; i < lines.length && i < 8; i++) {
    const line = lines[i]
    if (line.trim() === "") {
      i++
      break
    }
    const m = line.match(HEADER_RE)
    if (!m) break
    const key = m[1].toLowerCase()
    const val = m[2].trim()
    if (key === "subject") subject ||= val
    else if (key === "name") name ||= val
    else if (key === "email" || key === "reply-to")
      email ||= val.match(BARE_EMAIL_RE)?.[0] ?? ""
    else if (key === "from") {
      email ||=
        val.match(ANGLE_EMAIL_RE)?.[1] ?? val.match(BARE_EMAIL_RE)?.[0] ?? ""
      const display = val
        .replace(/<[^>]*>/, "")
        .replace(BARE_EMAIL_RE, "")
        .replace(/[()]/g, "")
        .trim()
      if (display) name ||= display
    }
  }

  const sawHeaders = i > 0 && (name !== "" || email !== "" || subject !== "")
  const body = (sawHeaders ? lines.slice(i).join("\n") : block).trim()

  // Drop unfilled template tokens like "[your name]" so the confirm UI shows an
  // empty required field instead of a fake value.
  const clean = /[[\]<>]/.test(name) ? "" : name.trim()

  return {
    name: clean.slice(0, 100),
    email: isValidEmail(email) ? email.trim().toLowerCase() : "",
    subject: subject.slice(0, 150),
    body,
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function mailtoLink(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${to}?${params.toString()}`
}
