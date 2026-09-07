import assert from "node:assert/strict"
import test from "node:test"

import {
  extractContactDraft,
  isValidEmail,
  mailtoLink,
} from "../src/lib/parse.ts"

test("email draft parsing preserves header precedence, body and identity normalization", () => {
  const markdown = `Here is your draft:\n\`\`\`email
From: Alice Smith <ALICE@EXAMPLE.COM>
Name: Ignored duplicate
Reply-to: ignored@example.com
Subject: RAG collaboration
Subject: Ignored subject

Hi Pranav,

I'd like to work together.
\`\`\`\nPlease review it.`
  assert.deepEqual(extractContactDraft(markdown), {
    name: "Alice Smith",
    email: "alice@example.com",
    subject: "RAG collaboration",
    body: "Hi Pranav,\n\nI'd like to work together.",
  })
})

test("email drafts accept separate headers and preserve a body without a blank separator", () => {
  assert.deepEqual(
    extractContactDraft(
      "```EMAIL\r\nName: Alice\r\nEmail: ALICE@example.com\r\nSubject: Hello\r\nHi Pranav\r\n```"
    ),
    {
      name: "Alice",
      email: "alice@example.com",
      subject: "Hello",
      body: "Hi Pranav",
    }
  )
})

test("unstructured draft bodies and missing fields keep their existing fallback behavior", () => {
  assert.deepEqual(
    extractContactDraft("```email\nHi Pranav,\r\nA question.\n```"),
    {
      name: "",
      email: "",
      subject: "",
      body: "Hi Pranav,\r\nA question.",
    }
  )
  assert.deepEqual(
    extractContactDraft("```email\nFrom: <invalid>\n\nHi\n```"),
    {
      name: "",
      email: "",
      subject: "",
      body: "From: <invalid>\n\nHi",
    }
  )
  assert.equal(extractContactDraft("Hello, no email draft yet."), null)
  assert.equal(extractContactDraft("```text\nHi\n```"), null)
  assert.equal(extractContactDraft("```email\n```"), null)
})

test("draft identity placeholders stay editable and header lengths remain bounded", () => {
  assert.deepEqual(
    extractContactDraft(
      "```email\nName: [your name]\nEmail: invalid\nSubject: Question\n\nHi\n```"
    ),
    {
      name: "",
      email: "",
      subject: "Question",
      body: "Hi",
    }
  )
  const draft = extractContactDraft(
    `\`\`\`email\nName: ${"n".repeat(105)}\nSubject: ${"s".repeat(155)}\n\nHi\n\`\`\``
  )
  assert.equal(draft?.name.length, 100)
  assert.equal(draft?.subject.length, 150)
})

test("only the first email block and first eight pseudo-headers are consumed", () => {
  const headers = Array.from(
    { length: 9 },
    (_, index) => `Subject: Subject ${index}`
  ).join("\n")
  assert.deepEqual(
    extractContactDraft(
      `\`\`\`email\n${headers}\n\nHi\n\`\`\`\n\`\`\`email\nAnother draft\n\`\`\``
    ),
    {
      name: "",
      email: "",
      subject: "Subject 0",
      body: "Subject: Subject 8\n\nHi",
    }
  )
})

test("email validation and mailto encoding preserve the public helper contract", () => {
  assert.equal(isValidEmail(" ALICE@example.com "), true)
  assert.equal(isValidEmail("alice@@example.com"), false)
  assert.equal(isValidEmail("a".repeat(250) + "@example.com"), false)
  const link = mailtoLink(
    "owner@example.com",
    "Research & RAG",
    "Hi + hello\nNext line"
  )
  const url = new URL(link)
  assert.equal(url.pathname, "owner@example.com")
  assert.equal(url.searchParams.get("subject"), "Research & RAG")
  assert.equal(url.searchParams.get("body"), "Hi + hello\nNext line")
})
