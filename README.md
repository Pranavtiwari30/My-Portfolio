# Pranav Tiwari — Portfolio

A dynamic portfolio for an **AI Engineer & SAP Backend Developer**, rebuilt from
a static page into a modern React app with two AI-driven features.

**Live:** https://pranav-portfolio.vercel.app

## Stack

| Layer      | Choice                                                          |
| ---------- | -------------------------------------------------------------- |
| Build      | Vite 8 + React 19 + TypeScript 6                              |
| Styling    | Tailwind CSS 4, shadcn/ui (`base-nova` preset, Base UI prims) |
| UI kit     | Vercel **AI Elements** (curated subset)                       |
| AI runtime | Vercel AI SDK (`ai`) on Edge Functions, any OpenAI-compatible provider |
| Fonts      | Outfit (display) + Manrope (body), self-hosted via Fontsource |
| Deploy     | Vercel (static build + `/api` Edge Functions)                 |

## Local development

```bash
npm install
npm run dev          # http://localhost:5173  (API routes run via a Vite middleware)
npm run build        # tsc -b && vite build  ->  dist/
npm run preview      # serve the production build
npm run typecheck
npm run lint
```

The `/api` routes are Vercel Edge Functions. In `npm run dev` they are served by a
small dev-only middleware (`vite-dev-api.ts`) so the AI features work locally too.

## AI features

Two features call an LLM through the AI SDK:

1. **Project deep dive** — on each project card, generates an engineer-to-engineer
   breakdown (architecture / why it matters / tradeoffs / how it's built),
   grounded in that project's summary.
2. **Contact assistant** — helps a visitor turn a rough idea into a ready-to-send
   intro message, with copy / open-in-email actions.

### Configuration

Both endpoints talk to an **OpenAI-compatible** chat-completions API. Set these
env vars (Vercel → Project → Settings → Environment Variables, or `.env.local`):

| Variable      | Required | Default                     | Notes                            |
| ------------- | -------- | --------------------------- | -------------------------------- |
| `AI_API_KEY`  | yes      | –                           | provider API key                 |
| `AI_BASE_URL` | no       | `https://api.openai.com/v1` | OpenAI-compatible endpoint        |
| `AI_MODEL`    | no       | `gpt-4o-mini`               | model id for the chosen provider |

**Free providers (no credit card):**

| Provider      | `AI_BASE_URL`                                          | `AI_MODEL`                            |
| ------------- | ----------------------------------------------------- | ------------------------------------ |
| Groq          | `https://api.groq.com/openai/v1`                      | `llama-3.3-70b-versatile`            |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/` | `gemini-2.0-flash`             |
| Cerebras      | `https://api.cerebras.ai/v1`                          | `llama-3.3-70b`                      |
| OpenRouter    | `https://openrouter.ai/api/v1`                        | `meta-llama/llama-3.3-70b-instruct:free` |

**Without `AI_API_KEY` the site works normally** — the AI panels show a friendly
"not configured yet" message.

## Structure

```
api/                     Vercel Edge Functions
  _lib.ts                provider wiring (OpenAI-compatible)
  chat.ts                contact assistant  (POST { messages })
  deep-dive.ts           project deep dive  (POST { project, angle })
src/
  lib/
    portfolio-data.ts    ← single source of truth for ALL content
    ai-context.ts        system prompts built from portfolio-data
    use-text-stream.ts   tiny fetch-based streaming hook (no client AI SDK)
    parse.ts             email-draft extraction, clipboard, mailto
  components/
    ui/                  shadcn primitives actually in use (button, dialog, textarea)
    ai-elements/          curated AI Elements (message, conversation, suggestion, shimmer)
    site/                page sections (hero, about, skills, projects, contact, …)
  App.tsx  main.tsx  index.css
vite-dev-api.ts          dev-only bridge that runs /api locally
```

### Editing content

Everything shown on the page — bio, skills, projects, links — lives in
`src/lib/portfolio-data.ts`. Change it there and both the UI and the AI prompts
update.

### Adding a shadcn component back

Unused shadcn/ui components were removed. To re-add one:

```bash
npx shadcn@latest add <component>
```

## Deploy

Push to a Vercel-connected repo, or `vercel deploy`. Vercel auto-detects Vite,
builds `dist/`, and serves `api/*.ts` as Edge Functions. Add the `AI_*` env vars
in the dashboard to switch the AI features on.
