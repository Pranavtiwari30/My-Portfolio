import { once } from "node:events"
import type { IncomingMessage, ServerResponse } from "node:http"
import { Readable } from "node:stream"
import { loadEnv, type Plugin } from "vite"

type ApiModule = { default?: unknown }
type ApiHandler = (request: Request) => Response | Promise<Response>
type LoadApiModule = (path: string) => Promise<ApiModule>
type LogError = (message: string) => void
type DevApiMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) => Promise<void>

function describeError(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error)
}

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
      server.middlewares.use(
        createDevApiMiddleware(
          (path) => server.ssrLoadModule(path),
          (message) => server.config.logger.error(message)
        )
      )
    },
  }
}

/** Kept independent of the Vite server so transport behavior can be tested. */
export function createDevApiMiddleware(
  loadModule: LoadApiModule,
  logError: LogError
): DevApiMiddleware {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ): Promise<void> => {
    const url = req.url ?? ""
    if (!url.startsWith("/api/")) return next()

    const route = url
      .split("?")[0]
      .replace(/^\/api\//, "")
      .replace(/\.[cm]?[tj]s$/, "")
      .replace(/\/+$/, "")

    if (!route || route.includes("..")) return next()

    const controller = new AbortController()
    const abort = () => controller.abort(new Error("API client disconnected."))
    const onClose = () => {
      if (!res.writableFinished) abort()
    }
    req.once("aborted", abort)
    res.once("close", onClose)
    res.once("error", abort)

    try {
      const mod = await loadModule(`/api/${route}.ts`)
      controller.signal.throwIfAborted()
      if (typeof mod.default !== "function") return next()

      const handler = mod.default as ApiHandler
      const response = await handler(toWebRequest(req, controller.signal))
      await sendWebResponse(res, response, controller.signal, logError)
    } catch (error) {
      if (controller.signal.aborted || res.destroyed) return

      logError(`[dev-api] ${route} failed: ${describeError(error)}`)
      if (res.headersSent) {
        // JSON would corrupt an already-started text/event stream.
        res.destroy()
        return
      }

      for (const header of res.getHeaderNames()) res.removeHeader(header)
      res.statusCode = 500
      res.setHeader("content-type", "application/json")
      res.end(JSON.stringify({ error: "Dev API handler threw. See terminal." }))
    } finally {
      req.off("aborted", abort)
      res.off("close", onClose)
      res.off("error", abort)
    }
  }
}

function toWebRequest(req: IncomingMessage, signal: AbortSignal): Request {
  const host = req.headers.host ?? "localhost"
  const url = `http://${host}${req.url ?? "/"}`
  const method = req.method ?? "GET"

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
    else if (value != null) headers.set(key, value)
  }

  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers, signal })
  }

  // Stream uploads instead of making a second, unbounded copy of the body.
  const init = {
    method,
    headers,
    signal,
    body: Readable.toWeb(req),
    duplex: "half" as const,
  }
  return new Request(url, init)
}

async function sendWebResponse(
  res: ServerResponse,
  response: Response,
  signal: AbortSignal,
  logError: LogError
): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))

  if (!response.body) {
    signal.throwIfAborted()
    res.end()
    return
  }

  const reader = response.body.getReader()
  const cancel = () => {
    void reader.cancel(signal.reason).catch((error: unknown) => {
      logError(
        `[dev-api] response cancellation failed: ${describeError(error)}`
      )
    })
  }
  signal.addEventListener("abort", cancel, { once: true })
  if (signal.aborted) cancel()

  let complete = false
  try {
    for (;;) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) {
        complete = true
        break
      }
      if (!res.write(value)) await once(res, "drain", { signal })
    }
    res.end()
  } finally {
    signal.removeEventListener("abort", cancel)
    if (!complete && !signal.aborted) cancel()
    reader.releaseLock()
  }
}
