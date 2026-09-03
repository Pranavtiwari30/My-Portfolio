/**
 * Builds the grounding context strings handed to the LLM.
 * Pure data helper — safe to import from the serverless API routes.
 */
import { about, profile, projects, skillGroups, socials } from "./portfolio-data"

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

Your job: help a visitor turn a rough idea ("I want to hire you", "collaborate on a RAG project", "ask about the GPU benchmarking work") into a clear, friendly outreach message they can send to ${profile.name}.

Rules:
- Be concise and warm. Two or three short paragraphs of guidance max.
- When the visitor gives you enough to work with, produce a ready-to-send draft inside a fenced code block labelled "email", addressed to ${profile.name}, written in the visitor's voice (first person as the visitor). Leave a [your name] placeholder if you don't know who they are.
- Ask at most one clarifying question if the request is too vague to draft anything.
- Only describe ${profile.name}'s real skills and projects, listed below. Never invent experience, employers, or availability.
- If asked something you cannot know (rates, notice period, visa status), say it's best asked directly and keep the draft.
- ${profile.name}'s email is ${profile.email}. Do not expose other private data.

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
${projects
    .map((p) =>
      p.name === projectName
        ? `${p.description}\nTech: ${p.tech.join(", ")}\nHighlights: ${p.highlights.join("; ")}\nBackground: ${p.context}`
        : null
    )
    .filter(Boolean)
    .join("\n") || "No structured facts available; be conservative."}`
}
