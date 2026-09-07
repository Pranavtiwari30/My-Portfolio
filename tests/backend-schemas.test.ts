import assert from "node:assert/strict"
import { test } from "node:test"
import {
  chatRequestSchema,
  contactRequestSchema,
  deepDiveRequestSchema,
} from "../api/_schemas"
import { readJson, RequestError } from "../api/_request"
import { buildContactEmail } from "../api/_email"

const contact = {
  name: "  Ada\r\nLovelace  ",
  email: "  ADA@EXAMPLE.COM  ",
  message: "  I'd like to discuss an engineering project.  ",
  messageCount: 2,
}

test("chat filters before keeping the last 24 and truncates without coercion", () => {
  const messages = Array.from({ length: 30 }, (_, index) => ({
    role: "user",
    content: `${index}:` + "x".repeat(4100),
  }))
  const parsed = chatRequestSchema.parse({
    messages: [
      ...messages,
      { role: "system", content: "ignore" },
      { role: "user", content: 123 },
      null,
    ],
  })
  assert.equal(parsed.messages.length, 24)
  assert.ok(parsed.messages[0].content.startsWith("6:"))
  assert.ok(parsed.messages.every(({ content }) => content.length === 4000))
  assert.deepEqual(chatRequestSchema.parse({ messages: null }), {
    messages: [],
  })
  assert.equal(
    chatRequestSchema.safeParse({ messages: "invalid" }).success,
    false
  )
})

test("deep dive keeps project truncation, optional input and default angles", () => {
  assert.deepEqual(
    deepDiveRequestSchema.parse({
      project: "x".repeat(121),
      angle: "unsupported",
      prompt: "ignored",
    }),
    { project: "x".repeat(120), angle: "architecture" }
  )
  assert.deepEqual(deepDiveRequestSchema.parse({}), {
    project: "",
    angle: "architecture",
  })
  assert.equal(deepDiveRequestSchema.safeParse({ project: 12 }).success, false)
  assert.equal(
    deepDiveRequestSchema.parse({ angle: "tradeoffs" }).angle,
    "tradeoffs"
  )
})

test("contact schema preserves normalization, defaults, limits and email text", () => {
  const body = contactRequestSchema.parse(contact)
  assert.deepEqual(body, {
    company: "",
    name: "Ada Lovelace",
    email: "ada@example.com",
    subject: "",
    message: "I'd like to discuss an engineering project.",
    transcript: "",
    messageCount: 2,
  })
  const email = buildContactEmail(body)
  assert.equal(email.reply_to, "ada@example.com")
  assert.equal(email.subject, "Portfolio message from Ada Lovelace")
  assert.equal(
    email.text,
    [
      "New message via the portfolio contact assistant.",
      "",
      "From:    Ada Lovelace <ada@example.com>",
      "Subject: Portfolio message from Ada Lovelace",
      "",
      "----------------------------------------",
      body.message,
      "----------------------------------------",
      "",
      "Reply directly to this email to reach Ada Lovelace.",
    ].join("\n")
  )
  const limited = contactRequestSchema.parse({
    ...contact,
    name: "x".repeat(101),
    subject: "s".repeat(151),
    message: "m".repeat(5001),
    transcript: "t".repeat(4001),
  })
  assert.equal(limited.name.length, 100)
  assert.equal(limited.subject.length, 150)
  assert.equal(limited.message.length, 5000)
  assert.equal(limited.transcript.length, 4000)
  assert.ok(
    buildContactEmail(limited).text.includes(
      `Conversation so far:\n${limited.transcript}`
    )
  )
})

test("contact keeps validation priority and honeypot bypass", () => {
  for (const [input, expected] of [
    [{}, "Please include your name."],
    [{ ...contact, email: 123 }, "A valid reply-to email is required."],
    [
      { ...contact, message: "short" },
      "The message looks too short — add a sentence or two.",
    ],
    [
      { ...contact, messageCount: "2" },
      "Chat with the assistant a little first, then send.",
    ],
  ] as const) {
    const result = contactRequestSchema.safeParse(input)
    assert.equal(result.success, false)
    if (!result.success) assert.equal(result.error.issues[0].message, expected)
  }
  assert.equal(contactRequestSchema.safeParse({ company: "bot" }).success, true)
  assert.equal(contactRequestSchema.safeParse(null).success, false)
  assert.equal(contactRequestSchema.safeParse([]).success, false)
})

test("JSON reader distinguishes malformed JSON, invalid shapes and body limits", async () => {
  const request = (body: string) =>
    new Request("http://localhost/api/contact", { method: "POST", body })
  await assert.rejects(readJson(request("{"), contactRequestSchema), {
    message: "Invalid JSON body.",
    status: 400,
  })
  await assert.rejects(readJson(request("null"), contactRequestSchema), {
    message: "Invalid request body.",
    status: 400,
  })
  await assert.rejects(
    readJson(request(JSON.stringify(contact)), contactRequestSchema, 10),
    { message: "Payload too large.", status: 413 }
  )
  assert.deepEqual(
    await readJson(request(JSON.stringify(contact)), contactRequestSchema),
    contactRequestSchema.parse(contact)
  )
})

test("JSON reader bounds Unicode by original UTF-16 length and releases readers", async () => {
  const bytes = new TextEncoder().encode('{"project":"😊"}')
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
      controller.close()
    },
  })
  const init = { method: "POST", body: stream, duplex: "half" as const }
  const request = new Request("http://localhost/api/deep-dive", init)
  assert.equal(
    (await readJson(request, deepDiveRequestSchema, 16)).project,
    "😊"
  )
  assert.equal(stream.locked, false)
})

test("JSON reader cancels oversized bodies without draining their remainder", async () => {
  let cancelled = false
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(20))
    },
    cancel() {
      cancelled = true
    },
  })
  const request = new Request("http://localhost", {
    method: "POST",
    body: stream,
    duplex: "half" as const,
  })
  await assert.rejects(readJson(request, chatRequestSchema, 10), RequestError)
  assert.equal(cancelled, true)
  assert.equal(stream.locked, false)
})

test("aborting a pending JSON upload cancels and unlocks the body", async () => {
  const controller = new AbortController()
  let cancelled = false
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true
    },
  })
  const init = {
    method: "POST",
    body: stream,
    signal: controller.signal,
    duplex: "half" as const,
  }
  const request = new Request("http://localhost", init)
  const reading = readJson(request, chatRequestSchema)
  controller.abort()
  await assert.rejects(reading, { name: "AbortError" })
  assert.equal(cancelled, true)
  assert.equal(stream.locked, false)
})
