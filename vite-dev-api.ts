import type { IncomingMessage, ServerResponse } from "node:http"
import { loadEnv, type Plugin } from "vite"

/**
 * Dev-only bridge that runs the files in `/api` (Vercel Edge-style
 * `export default (req: Request) => Response` handlers) behind `npm run dev`,
 * so the AI features work locally without the Vercel CLI. In production Vercel
 * serves these same files as serverless functions.
 */
export function devApiPlugin(): Plugin {
  return {
    name: "portfolio-dev-api",
    apply: "serve",
    configResolved(config) {
      // Expose .env / .env.local (all keys, no prefix) to the API handlers.
      Object.assign(process.env, loadEnv(config.mode, process.cwd(), ""))
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ""
        if (!url.startsWith("/api/")) return next()

        const route = url
          .split("?")[0]
          .replace(/^\/api\//, "")
          .replace(/\.[cm]?[tj]s$/, "")
          .replace(/\/+$/, "")

        if (!route || route.includes("..")) return next()

        try {
          const mod = await server.ssrLoadModule(`/api/${route}.ts`)
          const handler = mod.default
          if (typeof handler !== "function") return next()

          const response: Response = await handler(await toWebRequest(req))
          await sendWebResponse(res, response)
        } catch (err) {
          server.config.logger.error(
            `[dev-api] ${route} failed: ${(err as Error).stack ?? err}`
          )
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader("content-type", "application/json")
          }
          res.end(JSON.stringify({ error: "Dev API handler threw. See terminal." }))
        }
      })
    },
  }
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost"
  const url = `http://${host}${req.url ?? "/"}`
  const method = req.method ?? "GET"

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
    else if (value != null) headers.set(key, value)
  }

  let body: Buffer | undefined
  if (method !== "GET" && method !== "HEAD") {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
    }
    body = Buffer.concat(chunks)
  }

  return new Request(url, { method, headers, body })
}

async function sendWebResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))

  if (!response.body) {
    res.end()
    return
  }

  const reader = response.body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(Buffer.from(value))
    }
  } finally {
    res.end()
  }
}
