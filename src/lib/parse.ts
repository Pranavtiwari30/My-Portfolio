import { isValidEmail } from "./validation"

export { EMAIL_RE, isValidEmail } from "./validation"

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

type DraftHeaders = Omit<ContactDraft, "body">

const HEADER_RE = /^\s*(from|reply-to|name|email|subject)\s*:\s*(.+?)\s*$/i
const ANGLE_EMAIL_RE = /<\s*([^<>@\s]+@[^<>@\s]+)\s*>/
const BARE_EMAIL_RE = /[^\s<>()]+@[^\s<>()]+\.[^\s<>()]+/
const MAX_HEADER_LINES = 8

function applyDraftHeader(
  headers: DraftHeaders,
  key: string,
  value: string
): void {
  switch (key) {
    case "subject":
      headers.subject ||= value
      break
    case "name":
      headers.name ||= value
      break
    case "email":
    case "reply-to":
      headers.email ||= value.match(BARE_EMAIL_RE)?.[0] ?? ""
      break
    case "from": {
      headers.email ||=
        value.match(ANGLE_EMAIL_RE)?.[1] ??
        value.match(BARE_EMAIL_RE)?.[0] ??
        ""
      const displayName = value
        .replace(/<[^>]*>/, "")
        .replace(BARE_EMAIL_RE, "")
        .replace(/[()]/g, "")
        .trim()
      headers.name ||= displayName
      break
    }
  }
}

function parseDraftBlock(block: string): ContactDraft {
  const lines = block.replace(/\r\n/g, "\n").split("\n")
  const headers: DraftHeaders = { name: "", email: "", subject: "" }
  let bodyStart = 0

  for (
    ;
    bodyStart < lines.length && bodyStart < MAX_HEADER_LINES;
    bodyStart++
  ) {
    const line = lines[bodyStart]
    if (line.trim() === "") {
      bodyStart++
      break
    }
    const match = line.match(HEADER_RE)
    if (!match) break
    applyDraftHeader(headers, match[1].toLowerCase(), match[2].trim())
  }

  const sawHeaders = bodyStart > 0 && Object.values(headers).some(Boolean)
  const body = (sawHeaders ? lines.slice(bodyStart).join("\n") : block).trim()

  // Unfilled model template tokens should leave required form fields empty.
  const name = /[[\]<>]/.test(headers.name) ? "" : headers.name.trim()
  return {
    name: name.slice(0, 100),
    email: isValidEmail(headers.email)
      ? headers.email.trim().toLowerCase()
      : "",
    subject: headers.subject.slice(0, 150),
    body,
  }
}

/**
 * Read the first fenced email draft, preserving the body and first header
 * values. Missing or invalid identity fields stay editable in the confirm UI.
 */
export function extractContactDraft(markdown: string): ContactDraft | null {
  const block = markdown.match(/```email\s*\n([\s\S]*?)```/i)?.[1]
  return block ? parseDraftBlock(block) : null
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard access may be denied; the UI also provides an email link.
    return false
  }
}

export function mailtoLink(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${to}?${params.toString()}`
}
