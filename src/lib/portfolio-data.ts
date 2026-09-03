/**
 * Single source of truth for every piece of portfolio content.
 * Pure data (no React / no DOM) so it can be imported by both the client
 * and the serverless API routes.
 */

export type SocialLink = {
  label: string
  href: string
  handle: string
  icon: "mail" | "linkedin" | "github"
}

export type Project = {
  id: string
  name: string
  tagline: string
  description: string
  tech: string[]
  highlights: string[]
  links: { label: string; href: string; kind: "repo" | "demo" }[]
  /** Extra grounding notes handed to the AI deep-dive, never shown directly. */
  context: string
}

export type SkillGroup = {
  title: string
  skills: { name: string; featured?: boolean }[]
}

export const profile = {
  name: "Pranav Tiwari",
  firstName: "Pranav",
  lastName: "Tiwari",
  role: "AI Engineer & SAP Backend Developer",
  tagline:
    "AI Engineer & SAP Backend Developer bridging the gap between intelligent models and robust systems.",
  location: "India",
  email: "tiwari.pranav1999@gmail.com",
  resumeAvailable: false,
  initials: "PT",
} as const

export const about = {
  headline: "Where intelligent models meet enterprise-grade systems.",
  paragraphs: [
    "I am an engineer deeply passionate about creating intelligent solutions and robust architectures. My expertise spans **Machine Learning, Deep Learning, and Agentic AI**, integrated with dependable backend enterprise systems.",
    "As a **Certified ABAP (SAP Backend) Developer**, I know how critical scalable and secure infrastructure is. I merge that rigorous backend mindset with modern AI methods like **RAG and LLMs** to build applications that are not just intelligent, but enterprise-ready.",
    "Whether it is optimizing data preprocessing pipelines, evaluating complex models, or engineering state-of-the-art AI features, I thrive at the intersection of data and software engineering.",
  ],
  facts: [
    { label: "Focus", value: "Applied AI / RAG systems" },
    { label: "Backend", value: "Certified SAP ABAP" },
    { label: "Interests", value: "Agentic AI, model evaluation" },
  ],
} as const

export const skillGroups: SkillGroup[] = [
  {
    title: "Languages & Core",
    skills: [
      { name: "Python" },
      { name: "C++" },
      { name: "ABAP (SAP Backend) — Certified", featured: true },
      { name: "Data Structures & Algorithms" },
      { name: "OOP" },
    ],
  },
  {
    title: "AI & Machine Learning",
    skills: [
      { name: "Machine Learning" },
      { name: "Deep Learning" },
      { name: "LLMs", featured: true },
      { name: "RAG", featured: true },
      { name: "Agentic AI" },
      { name: "Computer Vision" },
    ],
  },
  {
    title: "Data & Evaluation",
    skills: [
      { name: "Feature Engineering & Data Preprocessing" },
      { name: "Model Evaluation" },
      { name: "Statistical Analysis" },
    ],
  },
  {
    title: "Tools & Platforms",
    skills: [{ name: "APIs" }, { name: "Git" }, { name: "PyTorch" }, { name: "FAISS" }],
  },
]

export const projects: Project[] = [
  {
    id: "arkive-ai",
    name: "Arkive AI",
    tagline: "AI compliance intelligence on a production-grade RAG pipeline",
    description:
      "AI Compliance Intelligence Platform built on a production-grade RAG pipeline. Verifies AI policies against UNESCO, OECD, and EU AI Act standards with semantic search and full audit traceability.",
    tech: [
      "RAG",
      "Semantic Search",
      "LLMs",
      "Vector Retrieval",
      "Audit Traceability",
      "Compliance",
    ],
    highlights: [
      "Checks policies against UNESCO, OECD & EU AI Act frameworks",
      "Semantic search over regulatory corpora",
      "End-to-end audit trail for every verdict",
    ],
    links: [
      { label: "Repository", href: "https://github.com/Pranavtiwari30/arkive-ai", kind: "repo" },
      { label: "Live demo", href: "https://arkive-ai.vercel.app", kind: "demo" },
    ],
    context:
      "Arkive AI is a Retrieval-Augmented Generation product. It ingests regulatory / governance documents (UNESCO AI ethics, OECD AI principles, EU AI Act), embeds and indexes them for semantic retrieval, and evaluates a submitted AI policy against those standards. Emphasis is on traceability: each compliance judgement is linked back to the retrieved source passages so an auditor can verify it.",
  },
  {
    id: "shiftshield",
    name: "ShiftShield",
    tagline: "Predictive parametric micro-insurance for delivery riders",
    description:
      "Predictive parametric micro-insurance for delivery riders. Uses hyper-local weather triggers and app-activity cross-validation via an ML pipeline to automatically process payouts before disruption hits.",
    tech: [
      "ML Pipeline",
      "Predictive Modeling",
      "Parametric Insurance",
      "Weather Data",
      "Risk Scoring",
    ],
    highlights: [
      "Hyper-local weather triggers drive automated payouts",
      "App-activity cross-validation reduces fraudulent claims",
      "Pays out before the disruption, not weeks after",
    ],
    links: [
      {
        label: "Repository",
        href: "https://github.com/Pranavtiwari30/GuideWire-DevTrails-ShiftShield-ZeroBias",
        kind: "repo",
      },
      {
        label: "Live demo",
        href: "https://guide-wire-dev-trails-alpha.vercel.app",
        kind: "demo",
      },
    ],
    context:
      "ShiftShield is a parametric insurance concept for gig delivery riders, built for the Guidewire DevTrails hackathon. Parametric means payouts are triggered by an objective measured parameter (localized adverse weather) rather than a manual claims process. An ML pipeline scores disruption risk and cross-checks it against the rider's in-app activity to validate that a shift was actually affected before releasing an automatic payout.",
  },
  {
    id: "gpu-accelerated-rag",
    name: "GPU-Accelerated RAG Inference",
    tagline: "Benchmarking GPU acceleration for low-latency, reliable LLM inference",
    description:
      "Benchmarked end-to-end evaluation of GPU acceleration in RAG pipelines using PyTorch, FAISS, and CUDA. Achieved a 2.96x speedup over vanilla LLMs and reduced hallucination by 32% on SQuAD v1.1.",
    tech: ["PyTorch", "FAISS", "CUDA", "RAG", "LLM Inference", "Benchmarking"],
    highlights: [
      "2.96x end-to-end speedup vs. a vanilla LLM baseline",
      "32% reduction in hallucination on SQuAD v1.1",
      "GPU-accelerated retrieval with FAISS + CUDA",
    ],
    links: [
      {
        label: "Repository",
        href: "https://github.com/Pranavtiwari30/GPU-Accelerated-RAG-for-Low-Latency-and-Reliable-LLM-Inference",
        kind: "repo",
      },
    ],
    context:
      "A research / benchmarking project measuring how GPU acceleration changes the latency and reliability profile of a RAG pipeline. It compares a vanilla LLM against a GPU-accelerated retrieval-augmented setup (PyTorch for the models, FAISS for the vector index, CUDA for acceleration), evaluated on the SQuAD v1.1 question-answering dataset. Headline results: 2.96x faster end to end, and 32% fewer hallucinated answers because generation is grounded in retrieved context.",
  },
]

export const socials: SocialLink[] = [
  {
    label: "Email",
    href: "mailto:tiwari.pranav1999@gmail.com",
    handle: "tiwari.pranav1999@gmail.com",
    icon: "mail",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/pranavtiwari3007/",
    handle: "in/pranavtiwari3007",
    icon: "linkedin",
  },
  {
    label: "GitHub",
    href: "https://github.com/Pranavtiwari30",
    handle: "@Pranavtiwari30",
    icon: "github",
  },
]

export const contact = {
  headline: "Let's build something extraordinary.",
  subhead:
    "Ready to collaborate on innovative AI and robust backend solutions? Tell the assistant what you need and it will help you draft the intro.",
} as const

export const nav = [
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
] as const

export const siteMeta = {
  title: "Pranav Tiwari — AI Engineer & SAP Backend Developer",
  description:
    "Portfolio of Pranav Tiwari: AI Engineer and Certified SAP ABAP Backend Developer building RAG systems, agentic AI, and enterprise-ready intelligent applications.",
  url: "https://pranav-portfolio.vercel.app",
} as const
