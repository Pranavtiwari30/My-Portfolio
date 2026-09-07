import assert from "node:assert/strict"
import { test } from "node:test"
import { textStreamResponse } from "../api/_ai"

test("AI text response preserves bytes and releases the upstream reader", async () => {
  const stream = new ReadableStream<string>({
    start(controller) {
      controller.enqueue("Hello ")
      controller.enqueue("世界 😊")
      controller.close()
    },
  })
  const response = await textStreamResponse(stream, () =>
    assert.fail("must not abort a completed stream")
  )
  assert.equal(
    response.headers.get("content-type"),
    "text/plain; charset=utf-8"
  )
  assert.equal(await response.text(), "Hello 世界 😊")
  assert.equal(stream.locked, false)
})

test("AI failures before first text reject before HTTP headers are committed", async () => {
  let aborted = false
  const stream = new ReadableStream<string>({
    start(controller) {
      controller.error(new Error("Provider unavailable"))
    },
  })
  await assert.rejects(
    textStreamResponse(stream, () => {
      aborted = true
    }),
    /Provider unavailable/
  )
  assert.equal(aborted, true)
  assert.equal(stream.locked, false)
})

test("midstream failures remain failures instead of completed partial text", async () => {
  let upstream: ReadableStreamDefaultController<string>
  let aborted = false
  const stream = new ReadableStream<string>({
    start(controller) {
      upstream = controller
      controller.enqueue("partial")
    },
  })
  const response = await textStreamResponse(stream, () => {
    aborted = true
  })
  const reader = response.body!.getReader()
  assert.equal(new TextDecoder().decode((await reader.read()).value), "partial")
  upstream!.error(new Error("Disconnected"))
  await assert.rejects(reader.read(), /Disconnected/)
  assert.equal(aborted, true)
  assert.equal(stream.locked, false)
  reader.releaseLock()
})

test("downstream cancellation aborts generation and unlocks its reader", async () => {
  let aborted = false
  let cancelled = false
  const stream = new ReadableStream<string>({
    start(controller) {
      controller.enqueue("first")
    },
    cancel() {
      cancelled = true
    },
  })
  const response = await textStreamResponse(stream, () => {
    aborted = true
  })
  await response.body!.cancel()
  assert.equal(aborted, true)
  assert.equal(cancelled, true)
  assert.equal(stream.locked, false)
})
