import assert from "node:assert/strict"
import { once } from "node:events"
import { createServer, get, request } from "node:http"
import type { AddressInfo } from "node:net"
import test, { type TestContext } from "node:test"
import { setImmediate } from "node:timers/promises"

import { createDevApiMiddleware } from "../vite-dev-api.ts"

type Handler = (request: Request) => Response | Promise<Response>

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function startServer(context: TestContext, handler: Handler) {
  const loadedPaths: string[] = []
  const errors: string[] = []
  const middleware = createDevApiMiddleware(
    async (path) => {
      loadedPaths.push(path)
      return { default: handler }
    },
    (message) => errors.push(message)
  )
  const server = createServer((req, res) => {
    void middleware(req, res, () => {
      res.statusCode = 404
      res.end("Not found")
    })
  })
  context.after(async () => {
    const closed = once(server, "close")
    server.close()
    server.closeAllConnections()
    await closed
  })
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const { port } = server.address() as AddressInfo
  return { origin: `http://127.0.0.1:${port}`, loadedPaths, errors }
}

test("dev API preserves request data, response metadata, and route aliases", async (context) => {
  const { origin, loadedPaths } = await startServer(context, async (req) => {
    assert.equal(req.method, "POST")
    assert.equal(req.headers.get("x-request-test"), "preserved")
    assert.equal(new URL(req.url).search, "?source=test")
    assert.deepEqual(await req.json(), { message: "hello" })
    return new Response("response body", {
      status: 201,
      headers: { "x-response-test": "preserved" },
    })
  })

  const response = await fetch(`${origin}/api/chat.ts?source=test`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-test": "preserved",
    },
    body: JSON.stringify({ message: "hello" }),
  })
  assert.equal(response.status, 201)
  assert.equal(response.headers.get("x-response-test"), "preserved")
  assert.equal(await response.text(), "response body")
  assert.deepEqual(loadedPaths, ["/api/chat.ts"])

  const missing = await fetch(`${origin}/other`)
  assert.equal(missing.status, 404)
  assert.deepEqual(loadedPaths, ["/api/chat.ts"])
})

test(
  "dev API makes uploads available to the handler before buffering the entire body",
  { timeout: 5_000 },
  async (context) => {
    const started = deferred()
    const { origin } = await startServer(context, async (req) => {
      started.resolve()
      return new Response(await req.text())
    })
    const upload = request(`${origin}/api/chat`, { method: "POST" })
    context.after(() => upload.destroy())
    const responseReady = once(upload, "response")
    upload.write("first ")
    await started.promise
    upload.end("second")
    const [response] = await responseReady
    const chunks: Buffer[] = []
    for await (const chunk of response) chunks.push(chunk as Buffer)
    assert.equal(Buffer.concat(chunks).toString(), "first second")
  }
)

test("dev API reports handler failures without exposing internals", async (context) => {
  const { origin, errors } = await startServer(context, () => {
    throw new Error("private provider details")
  })
  const response = await fetch(`${origin}/api/chat`)
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), {
    error: "Dev API handler threw. See terminal.",
  })
  assert.match(errors[0], /private provider details/)
})

test("dev API errors before streaming reset response headers and release the reader", async (context) => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new Error("initial stream failure"))
    },
  })
  const { origin, errors } = await startServer(
    context,
    () =>
      new Response(body, {
        headers: { "content-length": "1000", "content-encoding": "gzip" },
      })
  )
  const response = await fetch(`${origin}/api/chat`)
  assert.equal(response.status, 500)
  assert.equal(response.headers.get("content-encoding"), null)
  assert.deepEqual(await response.json(), {
    error: "Dev API handler threw. See terminal.",
  })
  assert.equal(body.locked, false)
  assert.match(errors[0], /initial stream failure/)
})

test(
  "dev API closes a failed stream without appending JSON to partial output",
  { timeout: 5_000 },
  async (context) => {
    let streamController!: ReadableStreamDefaultController<Uint8Array>
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller
        controller.enqueue(new TextEncoder().encode("partial output"))
      },
    })
    const { origin, errors } = await startServer(
      context,
      () => new Response(body)
    )
    const response = await fetch(`${origin}/api/chat`)
    const reader = response.body!.getReader()
    assert.equal(
      new TextDecoder().decode((await reader.read()).value),
      "partial output"
    )
    streamController.error(new Error("stream failed"))
    await assert.rejects(reader.read())
    reader.releaseLock()
    assert.equal(body.locked, false)
    assert.match(errors[0], /stream failed/)
  }
)

test(
  "dev API propagates disconnects and cancels and unlocks response streams",
  { timeout: 5_000 },
  async (context) => {
    const aborted = deferred()
    const cancelled = deferred()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("first chunk"))
      },
      cancel() {
        cancelled.resolve()
      },
    })
    const { origin, errors } = await startServer(context, (req) => {
      req.signal.addEventListener("abort", () => aborted.resolve(), {
        once: true,
      })
      return new Response(body)
    })
    const download = get(`${origin}/api/chat`)
    context.after(() => download.destroy())
    const [response] = await once(download, "response")
    await once(response, "data")
    response.destroy()
    await Promise.all([aborted.promise, cancelled.promise])
    await setImmediate()
    assert.equal(body.locked, false)
    assert.deepEqual(errors, [])
  }
)

test(
  "dev API applies response backpressure for a paused client",
  { timeout: 5_000 },
  async (context) => {
    const chunk = new Uint8Array(1024 * 1024)
    const totalChunks = 64
    let produced = 0
    const cancelled = deferred()
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(chunk)
        produced += 1
        if (produced === totalChunks) controller.close()
      },
      cancel() {
        cancelled.resolve()
      },
    })
    const { origin } = await startServer(context, () => new Response(body))
    const download = get(`${origin}/api/chat`)
    context.after(() => download.destroy())
    const [response] = await once(download, "response")
    response.pause()
    await setImmediate()
    assert.ok(
      produced < totalChunks,
      `The bridge buffered all ${produced} chunks`
    )
    response.destroy()
    await cancelled.promise
    await setImmediate()
    assert.equal(body.locked, false)
  }
)
