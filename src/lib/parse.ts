/** Pull a fenced ```email ... ``` draft out of an assistant message. */
export function extractEmailDraft(markdown: string): string | null {
  const labelled = markdown.match(/```email\s*\n([\s\S]*?)```/i)
  if (labelled?.[1]) return labelled[1].trim()

  const anyFence = markdown.match(/```(?:text|markdown|md)?\s*\n([\s\S]*?)```/i)
  if (anyFence?.[1] && anyFence[1].trim().length > 40) return anyFence[1].trim()

  return null
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
