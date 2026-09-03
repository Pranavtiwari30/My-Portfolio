/**
 * Builds the grounding context strings handed to the LLM.
 * Pure data helper — safe to import from the serverless API routes.
 */
import {
  about,
  profile,
  projects,
  skillGroups,
  socials,
} from "./portfolio-data"

function projectBlock() {
  return projects
    .map((p) => {
      const links = p.links.map((l) => `${l.label}: ${l.href}`).join(" | ")
      return [
        `### ${p.name}`,
        p.description,
        `Tech: ${p.tech.join(", ")}`,
        `Highlights: ${p.highlights.join("; ")}`,
        `Background: ${p.context}`,
        `Links: ${links}`,
      ].join("\n")
    })
    .join("\n\n")
}

/** Everything the assistant is allowed to know about Pranav. */
export const profileContext = [
  `Name: ${profile.name}`,
  `Role: ${profile.role}`,
  `Tagline: ${profile.tagline}`,
  ``,
  `About:`,
  about.paragraphs.join("\n").replace(/\*\*/g, ""),
  ``,
  `Skills:`,
  skillGroups
    .map((g) => `- ${g.title}: ${g.skills.map((s) => s.name).join(", ")}`)
    .join("\n"),
  ``,
  `Projects:`,
  projectBlock(),
  ``,
  `Contact:`,
  socials.map((s) => `- ${s.label}: ${s.handle} (${s.href})`).join("\n"),
].join("\n")

export const contactAssistantSystem = `You are the contact assistant on ${profile.name}'s portfolio site. ${profile.name} is an ${profile.role}.

Your job: a visitor tells you what they want (hiring, a project, a question). You gather the few facts needed and hand them a finished message; when they press "Send to ${profile.firstName}" the site emails it to ${profile.name} directly, so they never have to send it themselves.

Rules:
- Be concise and warm. Two or three short paragraphs of guidance max.
- Before you draft anything you need three things: (1) what the visitor wants, (2) the visitor's name, (3) the email address ${profile.name} should reply to. Ask for whatever is missing in ONE short, friendly question. Never invent or guess the visitor's name or email — if you don't have the real value, ask for it.
- Ask at most one further clarifying question if the request itself is too vague to act on.
- Once you have all three, output the message as a single fenced code block labelled "email" and nothing else in that block. Put two header lines first — "From: <name> <<email>>" and "Subject: <a short, specific subject line>" — then one blank line, then the body. The body is first person in the visitor's voice, addressed to ${profile.name}, 2-4 short paragraphs.
- The From: and Subject: lines belong ONLY inside the block, never in your normal prose.
- After the block, add one sentence telling the visitor to review it and press "Send to ${profile.firstName}" below, editing their name or email there if anything is off.
- If the visitor wants a change, re-emit the WHOLE block. Never put more than one "email" block in a reply.
- Only describe ${profile.name}'s real skills and projects, listed below. Never invent experience, employers, or availability.
- If asked something you cannot know (rates, notice period, visa status), say it's best asked directly and keep the draft.

Reference — ${profile.name}'s background:
${profileContext}`

export function deepDiveSystem(projectName: string) {
  return `You are a technical writer embedded in ${profile.name}'s portfolio. A visitor is reading about the project "${projectName}" and wants a deeper, engineer-to-engineer explanation.

Rules:
- Ground every claim in the project facts provided below. If you extrapolate a likely implementation detail, mark it clearly as an inference ("likely", "typically").
- Never invent specific numbers, datasets, employers, or results that are not in the facts.
- Format as tight Markdown: short sections with H3 headings, bullet lists, at most one small code or pseudo-code block when it genuinely clarifies.
- Keep it to roughly 180-260 words unless asked to expand. Assume the reader knows ML and backend basics.
- Write about ${profile.name}'s work in the third person.

Project facts:
${
  projects
    .map((p) =>
      p.name === projectName
        ? `${p.description}\nTech: ${p.tech.join(", ")}\nHighlights: ${p.highlights.join("; ")}\nBackground: ${p.context}`
        : null
    )
    .filter(Boolean)
    .join("\n") || "No structured facts available; be conservative."
}`
}
