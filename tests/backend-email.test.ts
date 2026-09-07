import assert from "node:assert/strict"
import { test } from "node:test"
import { retryDelay, sendContactEmail, waitForRetry } from "../api/_email"
import { contactRequestSchema } from "../api/_schemas"

const body = contactRequestSchema.parse({
  name: "Ada",
  email: "ada@example.com",
  message: "Let's discuss an engineering project.",
  messageCount: 2,
})
const policy = {
  maxRetries: 2,
  attemptTimeoutMs: 50,
  totalTimeoutMs: 200,
  baseDelayMs: 0,
}

test("email retries transient failures with a stable payload and idempotency key", async (t) => {
  const calls: RequestInit[] = []
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      calls.push(init)
      if (calls.length === 1)
        return Response.json({ message: "busy" }, { status: 503 })
      if (calls.length === 2)
        return Response.json(
          { message: "slow down" },
          { status: 429, headers: { "retry-after": "0" } }
        )
      return Response.json({ id: "test-only" })
    }
  )
  await sendContactEmail(body, new AbortController().signal, policy)
  assert.equal(calls.length, 3)
  assert.equal(new Set(calls.map((call) => call.body)).size, 1)
  const keys = calls.map((call) =>
    new Headers(call.headers).get("idempotency-key")
  )
  assert.ok(keys[0])
  assert.equal(new Set(keys).size, 1)
})

test("email does not retry permanent errors and validates provider error shapes", async (t) => {
  let calls = 0
  t.mock.method(globalThis, "fetch", async () => {
    calls++
    return Response.json({ message: { unexpected: true } }, { status: 422 })
  })
  await assert.rejects(
    sendContactEmail(body, new AbortController().signal, policy),
    /The email service rejected/
  )
  assert.equal(calls, 1)
})

test("email handles non-JSON service failures and stops after retry exhaustion", async (t) => {
  let calls = 0
  t.mock.method(globalThis, "fetch", async () => {
    calls++
    return new Response("gateway failure", { status: 502 })
  })
  await assert.rejects(
    sendContactEmail(body, new AbortController().signal, policy),
    /The email service rejected/
  )
  assert.equal(calls, 3)
})

test("network errors retry, while aborts stop immediately", async (t) => {
  let calls = 0
  t.mock.method(globalThis, "fetch", async () => {
    calls++
    throw new TypeError("Network unavailable")
  })
  await assert.rejects(
    sendContactEmail(body, new AbortController().signal, policy),
    /Network unavailable/
  )
  assert.equal(calls, 3)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(sendContactEmail(body, controller.signal, policy), {
    name: "AbortError",
  })
  assert.equal(calls, 3)
})

test("per-attempt timeout retries and overall deadline bounds retry-after", async (t) => {
  let calls = 0
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      calls++
      return new Promise<Response>((_resolve, reject) =>
        init.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true }
        )
      )
    }
  )
  await assert.rejects(
    sendContactEmail(body, new AbortController().signal, {
      ...policy,
      attemptTimeoutMs: 5,
    }),
    { name: "TimeoutError" }
  )
  assert.equal(calls, 3)
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { message: "busy" },
      { status: 429, headers: { "retry-after": "3600" } }
    )
  )
  await assert.rejects(
    sendContactEmail(body, new AbortController().signal, {
      ...policy,
      totalTimeoutMs: 10,
    }),
    { name: "TimeoutError" }
  )
})

test("retry delays support seconds and HTTP dates; pending waits are cancellable", async () => {
  const now = Date.parse("2026-01-01T00:00:00Z")
  assert.equal(retryDelay("2", 250, now), 2000)
  assert.equal(retryDelay("Thu, 01 Jan 2026 00:00:05 GMT", 250, now), 5000)
  for (const value of [null, "", "-2", "nonsense"])
    assert.equal(retryDelay(value, 250, now), 250)
  const controller = new AbortController()
  const pending = waitForRetry(10_000, controller.signal)
  controller.abort()
  await assert.rejects(pending, { name: "AbortError" })
})

test("confirmed email success is independent of failed or stalled body cleanup", async (t) => {
  for (const cancel of [
    () => Promise.reject(new TypeError("Cleanup failed")),
    () => new Promise<void>(() => undefined),
  ]) {
    let calls = 0
    t.mock.method(globalThis, "fetch", async () => {
      calls++
      return new Response(new ReadableStream({ cancel }))
    })
    await sendContactEmail(body, new AbortController().signal, policy)
    assert.equal(calls, 1)
  }
})
