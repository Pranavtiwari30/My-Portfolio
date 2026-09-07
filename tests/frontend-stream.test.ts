import assert from "node:assert/strict"
import test from "node:test"

import { readTextStream } from "../src/lib/text-stream.ts"
import {
  apiErrorMessage,
  errorMessage,
  readJsonResponse,
  requestTextStream,
  requireContactSuccess,
} from "../src/lib/client-api.ts"

const encoder = new TextEncoder()

test("stream decoding preserves UTF-8 across arbitrary chunk boundaries and releases the reader", async () => {
  const expected = "Hello 👋, café!"
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of encoder.encode(expected))
        controller.enqueue(new Uint8Array([byte]))
      controller.close()
    },
  })
  const updates: string[] = []
  assert.equal(
    await readTextStream(body, new AbortController().signal, (value) =>
      updates.push(value)
    ),
    expected
  )
  assert.equal(updates.at(-1), expected)
  assert.equal(
    updates.some((value) => value.includes("�")),
    false
  )
  assert.equal(body.locked, false)
})

test("stream decoder flushes an incomplete trailing code point", async () => {
  const updates: string[] = []
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([0xe2, 0x82]))
      controller.close()
    },
  })
  assert.equal(
    await readTextStream(body, new AbortController().signal, (text) =>
      updates.push(text)
    ),
    "�"
  )
  assert.deepEqual(updates, ["�"])
})

test("aborting a pending read cancels the source and releases its lock", async () => {
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true
    },
  })
  const controller = new AbortController()
  const result = readTextStream(body, controller.signal, () =>
    assert.fail("No text expected")
  )
  controller.abort()
  await assert.rejects(result, { name: "AbortError" })
  assert.equal(cancelled, true)
  assert.equal(body.locked, false)
})

test("cancellation prevents buffered chunks from updating an obsolete response", async () => {
  const controller = new AbortController()
  const updates: string[] = []
  const body = new ReadableStream<Uint8Array>({
    start(source) {
      source.enqueue(encoder.encode("first"))
      source.enqueue(encoder.encode("stale"))
      source.close()
    },
  })
  await assert.rejects(
    readTextStream(body, controller.signal, (text) => {
      updates.push(text)
      controller.abort()
    }),
    { name: "AbortError" }
  )
  assert.deepEqual(updates, ["first"])
  assert.equal(body.locked, false)
})

test("stream failures retain the source error and release the reader", async () => {
  const failure = new Error("Upstream connection failed")
  const body = new ReadableStream<Uint8Array>({
    pull(source) {
      source.error(failure)
    },
  })
  await assert.rejects(
    readTextStream(body, new AbortController().signal, () => undefined),
    (error) => error === failure
  )
  assert.equal(body.locked, false)
})

test("an aborted signal does not lock or read the stream", async () => {
  const body = new ReadableStream<Uint8Array>()
  const signal = AbortSignal.abort()
  await assert.rejects(
    readTextStream(body, signal, () => assert.fail()),
    { name: "AbortError" }
  )
  assert.equal(body.locked, false)
})

test("client error messages validate payload types and distinguish timeouts", () => {
  assert.equal(
    apiErrorMessage({ error: "Rate limited" }, "fallback"),
    "Rate limited"
  )
  for (const value of [
    null,
    [],
    "error",
    { error: { secret: true } },
    { error: false },
  ]) {
    assert.equal(apiErrorMessage(value, "fallback"), "fallback")
  }
  assert.equal(
    errorMessage(new DOMException("expired", "TimeoutError")),
    "The request timed out. Please try again."
  )
  assert.equal(errorMessage({ message: "untrusted" }), "Something went wrong.")
})

test("HTML error bodies use fallback parsing, while interrupted JSON reads propagate", async () => {
  assert.equal(
    await readJsonResponse(new Response("<html>Unavailable</html>")),
    null
  )
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new DOMException("aborted", "AbortError"))
    },
  })
  await assert.rejects(readJsonResponse(new Response(body)), {
    name: "AbortError",
  })
})

test("contact success requires a boolean true response and propagates API errors", async () => {
  await requireContactSuccess(Response.json({ ok: true }))
  await assert.rejects(
    requireContactSuccess(Response.json({ ok: "true" })),
    /Couldn't send \(200\)/
  )
  await assert.rejects(
    requireContactSuccess(
      Response.json({ error: "Please provide a name." }, { status: 400 })
    ),
    /Please provide a name/
  )
  await assert.rejects(
    requireContactSuccess(new Response("Unavailable", { status: 503 })),
    /Couldn't send \(503\)/
  )
})

test("stream requests POST the original payload and report validated API errors", async (context) => {
  const controller = new AbortController()
  const input = { messages: [{ role: "user", content: "Hello" }] }
  const fetchMock = context.mock.method(
    globalThis,
    "fetch",
    async (url: string, options: RequestInit) => {
      assert.equal(url, "/api/chat")
      assert.equal(options.method, "POST")
      assert.equal(options.body, JSON.stringify(input))
      assert.equal(options.signal, controller.signal)
      return new Response("A streamed reply")
    }
  )
  assert.equal(
    await requestTextStream(
      "/api/chat",
      input,
      controller.signal,
      () => undefined
    ),
    "A streamed reply"
  )
  fetchMock.mock.mockImplementation(async () =>
    Response.json({ error: "Unavailable" }, { status: 503 })
  )
  await assert.rejects(
    requestTextStream("/api/chat", input, controller.signal, () => undefined),
    /Unavailable/
  )
})
