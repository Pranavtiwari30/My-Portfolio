import assert from "node:assert/strict"
import { test } from "node:test"

// All outbound fetches below are mocked; these keys never contact a provider.
process.env.AI_API_KEY = "test-only"
process.env.RESEND_API_KEY = "test-only"
process.env.AI_BASE_URL = "https://provider.invalid/v1"
const { default: chat } = await import("../api/chat")
const { default: deepDive } = await import("../api/deep-dive")
const { default: contact } = await import("../api/contact")

function request(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request(`https://portfolio.test/api/${path}`, {
    method: "POST",
    headers: { host: "portfolio.test", ...headers },
    body: JSON.stringify(body),
  })
}

function completion(text: string): Response {
  const chunk = {
    id: "test",
    object: "chat.completion.chunk",
    created: 0,
    model: "test",
    choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
  }
  const final = {
    ...chunk,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  }
  return new Response(
    `data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify(final)}\n\ndata: [DONE]\n\n`,
    { headers: { "content-type": "text/event-stream" } }
  )
}

test("routes reject malformed input before making outbound calls", async (t) => {
  t.mock.method(globalThis, "fetch", () =>
    assert.fail("invalid requests must not reach a provider")
  )
  for (const handler of [chat, deepDive, contact]) {
    assert.equal(
      (await handler(new Request("https://portfolio.test", { method: "GET" })))
        .status,
      405
    )
    assert.equal((await handler(request("test", null))).status, 400)
  }
  const response = await chat(request("chat", { messages: [] }))
  assert.deepEqual(await response.json(), { error: "No message provided." })
  assert.equal(response.status, 400)
})

test("contact honeypots and invalid origins never send email", async (t) => {
  t.mock.method(globalThis, "fetch", () => assert.fail("must not send email"))
  assert.deepEqual(
    await (await contact(request("contact", { company: "bot" }))).json(),
    { ok: true }
  )
  for (const origin of ["malformed", "https://other.test"]) {
    assert.equal(
      (await contact(request("contact", {}, { origin }))).status,
      403
    )
  }
})

test("chat streams the provider text and preserves the normalized conversation", async (t) => {
  let payload:
    | {
        messages: { role: string; content: string }[]
        temperature: number
        max_tokens: number
      }
    | undefined
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      payload = JSON.parse(String(init.body))
      return completion("Hello from the model.")
    }
  )
  const response = await chat(
    request("chat", { messages: [{ role: "user", content: "Hello" }] })
  )
  assert.equal(response.status, 200)
  assert.equal(await response.text(), "Hello from the model.")
  assert.deepEqual(payload?.messages.at(-1), { role: "user", content: "Hello" })
  assert.equal(payload?.messages[0].role, "system")
  assert.equal(payload?.temperature, 0.5)
  assert.equal(payload?.max_tokens, 900)
})

test("deep dive retains fallback question and generation settings", async (t) => {
  let payload:
    | {
        messages: { role: string; content: string }[]
        temperature: number
        max_tokens: number
      }
    | undefined
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      payload = JSON.parse(String(init.body))
      return completion("Architecture details.")
    }
  )
  const response = await deepDive(
    request("deep-dive", { project: "Example", angle: "unsupported" })
  )
  assert.equal(await response.text(), "Architecture details.")
  assert.deepEqual(payload?.messages.at(-1), {
    role: "user",
    content:
      "Walk through the likely architecture of this project end to end.\n\nProject: Example",
  })
  assert.equal(payload?.temperature, 0.4)
  assert.equal(payload?.max_tokens, 700)
})

test("AI provider rejection becomes a 502 instead of an empty successful response", async (t) => {
  t.mock.method(console, "error", () => undefined)
  let calls = 0
  t.mock.method(globalThis, "fetch", async () => {
    calls++
    return Response.json(
      {
        error: {
          message: "Invalid provider key",
          type: "authentication_error",
        },
      },
      { status: 401 }
    )
  })
  const response = await chat(
    request("chat", { messages: [{ role: "user", content: "Hello" }] })
  )
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: "Invalid provider key" })
  assert.equal(calls, 1)
})
