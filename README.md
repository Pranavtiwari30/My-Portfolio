# Pranav Tiwari — Portfolio

A dynamic portfolio for an **AI Engineer & SAP Backend Developer**, rebuilt from
a static page into a modern React app with two AI-driven features.

**Live:** https://pranav-portfolio-rust.vercel.app/

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
npm test             # regression tests; external AI/email calls are mocked
```

The `/api` routes are Vercel Edge Functions. In `npm run dev` they are served by a
small dev-only middleware (`vite-dev-api.ts`) so the AI features work locally too.

`typecheck` checks the frontend, Edge routes, dev middleware, and tests using
strict TypeScript settings. Run `npm test`, `npm run typecheck`, `npm run lint`,
and `npm run build` before opening a pull request.

### API validation and reliability

The backend is TypeScript. Runtime Zod schemas in `api/_schemas.ts` validate JSON
before provider calls while preserving established defaults, filtering,
truncation, and contact field normalization. Unrecognized object keys are
ignored for compatibility; invalid shapes receive a 400 response. Request
readers stop at 16,000 decoded UTF-16 characters for contact and 128,000 for AI
requests, returning 413 without buffering the rest of an oversized body.

AI calls share two SDK retries with exponential backoff, a 60-second total
deadline, a 20-second first-content deadline, and a 15-second gap limit between
content chunks. Errors before the first text chunk return JSON with status 502;
failures after streaming starts terminate the stream. Partial output is never
replayed by a retry.

Email delivery retries network failures, timeouts, HTTP 408/429, and server
errors at most twice, with exponential backoff, jitter, and `Retry-After` support.
Each attempt has an eight-second deadline within a 25-second operation deadline.
The same Resend idempotency key and payload are reused across automatic retries
of one send. Separate visitor submissions are separate operations. Rate limiting
remains best-effort per Edge isolate (three sends per ten minutes and eight per
day), with bounded storage; it is not a shared, durable quota.

The browser cancels stale streams, releases readers, and batches text rendering
by animation frame. The local dev bridge streams uploads and honors response
backpressure, forwarding client disconnects to the handler's abort signal.

## AI features

Two features call an LLM through the AI SDK:

1. **Project deep dive** — on each project card, generates an engineer-to-engineer
   breakdown (architecture / why it matters / tradeoffs / how it's built),
   grounded in that project's summary.
2. **Contact assistant** — helps a visitor turn a rough idea into a ready-to-send
   intro message. It also collects the visitor's name + reply-to email, and a
   **"Send to Pranav"** button emails the message straight to the owner's inbox
   via Resend (with copy / open-in-email as fallbacks).

### Configuration

Both endpoints talk to an **OpenAI-compatible** chat-completions API. Set these
env vars (Vercel → Project → Settings → Environment Variables, or `.env.local`):

| Variable             | Required | Default                       | Notes                                                              |
| -------------------- | -------- | ----------------------------- | ----------------------------------------------------------------- |
| `AI_API_KEY`         | yes      | –                             | provider API key                                                  |
| `AI_BASE_URL`        | no       | `https://api.openai.com/v1`   | OpenAI-compatible endpoint                                        |
| `AI_MODEL`           | no       | `gpt-4o-mini`                 | model id for the chosen provider                                  |
| `RESEND_API_KEY`     | no       | –                             | [Resend](https://resend.com) key — enables the "Send to Pranav" button; without it the assistant still drafts + offers copy/mailto |
| `CONTACT_TO_EMAIL`   | no       | `profile.email`               | recipient override for `/api/contact`                             |
| `CONTACT_FROM_EMAIL` | no       | `onboarding@resend.dev`       | sender override (needs a domain verified in Resend)              |

**Free providers (no credit card):**

| Provider      | `AI_BASE_URL`                                          | `AI_MODEL`                            |
| ------------- | ----------------------------------------------------- | ------------------------------------ |
| Groq          | `https://api.groq.com/openai/v1`                      | `openai/gpt-oss-120b`               |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/` | `gemini-2.0-flash`             |
| Cerebras      | `https://api.cerebras.ai/v1`                          | `llama-3.3-70b`                      |
| OpenRouter    | `https://openrouter.ai/api/v1`                        | `meta-llama/llama-3.3-70b-instruct:free` |

Groq retires models regularly — check `console.groq.com/docs/models` if `AI_MODEL`
starts returning 404s.

**Without `AI_API_KEY` the site works normally** — the AI panels show a friendly
"not configured yet" message.

### Contact assistant email delivery

`/api/contact` emails the drafted message to the owner via Resend. To turn it on:

1. Create a Resend account **with the owner address** (`profile.email`) — the
   shared `onboarding@resend.dev` sender only delivers to that address until you
   verify a domain.
2. Add `RESEND_API_KEY` from `resend.com/api-keys` to the environment and redeploy.

The route has a honeypot field, strict name/email/length validation, a
minimum-conversation gate, and a best-effort per-IP rate limit. The visitor's
address is set as the email's `reply-to`.

## Structure

```
api/                     Vercel Edge Functions
  _lib.ts                provider wiring (OpenAI-compatible) + Resend config
  chat.ts                contact assistant  (POST { messages })
  deep-dive.ts           project deep dive  (POST { project, angle })
  contact.ts             "Send to Pranav" — validate + rate-limit + Resend
src/
  lib/
    portfolio-data.ts    ← single source of truth for ALL content
    ai-context.ts        system prompts built from portfolio-data
    use-text-stream.ts   tiny fetch-based streaming hook (no client AI SDK)
    parse.ts             contact-draft extraction, email validation, clipboard, mailto
  components/
    ui/                  shadcn primitives actually in use (button, dialog, input, textarea)
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
