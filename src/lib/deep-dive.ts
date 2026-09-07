export const DEEP_DIVE_ANGLES = [
  {
    id: "architecture",
    label: "Architecture",
    question:
      "Walk through the likely architecture of this project end to end.",
  },
  {
    id: "why-it-matters",
    label: "Why it matters",
    question:
      "Explain why this project matters and what problem it really solves.",
  },
  {
    id: "tradeoffs",
    label: "Tradeoffs",
    question:
      "What are the key engineering tradeoffs and constraints in this project?",
  },
  {
    id: "how-built",
    label: "How it's built",
    question: "How was this project most likely built, step by step?",
  },
] as const

export type DeepDiveAngle = (typeof DEEP_DIVE_ANGLES)[number]["id"]
