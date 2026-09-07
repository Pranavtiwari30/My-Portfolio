import assert from "node:assert/strict"
import test, { type TestContext } from "node:test"
import { createElement } from "react"
import { act, create, type ReactTestRenderer } from "react-test-renderer"

import { useTextStream } from "../src/lib/use-text-stream.ts"
import { useClipboard } from "../src/lib/use-clipboard.ts"

type StreamClient = ReturnType<typeof useTextStream>

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

function mockFrames(context: TestContext): {
  flush: () => Promise<void>
  size: () => number
} {
  const frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 0
  const originalRequest = Object.getOwnPropertyDescriptor(
    globalThis,
    "requestAnimationFrame"
  )
  const originalCancel = Object.getOwnPropertyDescriptor(
    globalThis,
    "cancelAnimationFrame"
  )
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value: (callback: FrameRequestCallback): number => {
      const id = ++nextFrame
      frames.set(id, callback)
      return id
    },
  })
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    writable: true,
    value: (id: number): void => {
      frames.delete(id)
    },
  })
  context.after(() => {
    if (originalRequest)
      Object.defineProperty(
        globalThis,
        "requestAnimationFrame",
        originalRequest
      )
    else Reflect.deleteProperty(globalThis, "requestAnimationFrame")
    if (originalCancel)
      Object.defineProperty(globalThis, "cancelAnimationFrame", originalCancel)
    else Reflect.deleteProperty(globalThis, "cancelAnimationFrame")
  })
  return {
    size: () => frames.size,
    flush: async () => {
      await act(() => {
        for (const [id, callback] of frames) {
          frames.delete(id)
          callback(performance.now())
        }
      })
    },
  }
}

async function mountStream(
  context: TestContext
): Promise<{ current: () => StreamClient; unmount: () => Promise<void> }> {
  let client: StreamClient
  let renderer: ReactTestRenderer
  let mounted = true
  function Harness(): null {
    client = useTextStream("/api/chat")
    return null
  }
  await act(() => {
    renderer = create(createElement(Harness))
  })
  const unmount = async (): Promise<void> => {
    if (!mounted) return
    mounted = false
    await act(() => {
      renderer.unmount()
    })
  }
  context.after(unmount)
  return { current: () => client, unmount }
}

test("superseded fetches cannot replace the newest text or report stale errors", async (context) => {
  mockFrames(context)
  const requests: {
    resolve: (response: Response) => void
    reject: (error: Error) => void
    signal: AbortSignal
  }[] = []
  context.mock.method(
    globalThis,
    "fetch",
    (_endpoint: string, init: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        requests.push({ resolve, reject, signal: init.signal as AbortSignal })
      })
  )
  const stream = await mountStream(context)
  let first: Promise<string | null>
  let second: Promise<string | null>
  let third: Promise<string | null>
  await act(() => {
    first = stream.current().run({ turn: 1 })
    second = stream.current().run({ turn: 2 })
    third = stream.current().run({ turn: 3 })
  })
  assert.equal(requests[0].signal.aborted, true)
  assert.equal(requests[1].signal.aborted, true)
  await act(async () => {
    requests[2].resolve(new Response("newest"))
    assert.equal(await third, "newest")
  })
  await act(async () => {
    requests[0].resolve(new Response("obsolete"))
    requests[1].reject(new Error("obsolete failure"))
    assert.equal(await first, null)
    assert.equal(await second, null)
  })
  assert.equal(stream.current().text, "newest")
  assert.equal(stream.current().status, "done")
  assert.equal(stream.current().error, null)
})

test("stream text updates are coalesced by frame, and stop flushes the latest partial text", async (context) => {
  const frames = mockFrames(context)
  const encoder = new TextEncoder()
  let source: ReadableStreamDefaultController<Uint8Array>
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      source = controller
    },
    cancel() {
      cancelled = true
    },
  })
  context.mock.method(globalThis, "fetch", async () => new Response(body))
  const stream = await mountStream(context)
  let request: Promise<string | null>
  await act(() => {
    request = stream.current().run({})
  })
  await act(() => {
    source.enqueue(encoder.encode("one"))
    source.enqueue(encoder.encode(" two"))
    source.enqueue(encoder.encode(" three"))
  })
  assert.equal(frames.size(), 1)
  assert.equal(stream.current().text, "")
  await frames.flush()
  assert.equal(stream.current().text, "one two three")
  await act(() => {
    source.enqueue(encoder.encode(" four"))
  })
  await act(() => {
    stream.current().stop()
  })
  assert.equal(await request!, null)
  assert.equal(stream.current().text, "one two three four")
  assert.equal(stream.current().status, "done")
  assert.equal(cancelled, true)
  assert.equal(frames.size(), 0)
  assert.equal(body.locked, false)
})

test("reset aborts a pending stream and leaves an empty idle client", async (context) => {
  const frames = mockFrames(context)
  let resolveResponse: (response: Response) => void
  context.mock.method(
    globalThis,
    "fetch",
    () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve
      })
  )
  const stream = await mountStream(context)
  let request: Promise<string | null>
  await act(() => {
    request = stream.current().run({})
  })
  await act(() => {
    stream.current().reset()
  })
  await act(async () => {
    resolveResponse(new Response("must not return after reset"))
    assert.equal(await request, null)
  })
  assert.equal(stream.current().text, "")
  assert.equal(stream.current().status, "idle")
  assert.equal(stream.current().error, null)
  assert.equal(frames.size(), 0)
})

test("unmount cancels pending readers and scheduled rendering", async (context) => {
  const frames = mockFrames(context)
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("partial"))
    },
    cancel() {
      cancelled = true
    },
  })
  context.mock.method(globalThis, "fetch", async () => new Response(body))
  const stream = await mountStream(context)
  let request: Promise<string | null>
  await act(() => {
    request = stream.current().run({})
  })
  assert.equal(frames.size(), 1)
  await stream.unmount()
  assert.equal(await request!, null)
  assert.equal(cancelled, true)
  assert.equal(frames.size(), 0)
  assert.equal(body.locked, false)
})

test("stream deadlines become visible errors and release the underlying reader", async (context) => {
  mockFrames(context)
  const timeout = new AbortController()
  context.mock.method(AbortSignal, "timeout", () => timeout.signal)
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true
    },
  })
  context.mock.method(globalThis, "fetch", async () => new Response(body))
  const stream = await mountStream(context)
  let request: Promise<string | null>
  await act(() => {
    request = stream.current().run({})
  })
  await act(async () => {
    timeout.abort(new DOMException("expired", "TimeoutError"))
    assert.equal(await request, null)
  })
  assert.equal(stream.current().status, "error")
  assert.equal(
    stream.current().error,
    "The request timed out. Please try again."
  )
  assert.equal(cancelled, true)
  assert.equal(body.locked, false)
})

test("clipboard reset invalidates in-flight copies and unmount clears feedback timers", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] })
  let resolveWrite: () => void
  const originalClipboard = Object.getOwnPropertyDescriptor(
    navigator,
    "clipboard"
  )
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve
        }),
    },
  })
  context.after(() => {
    if (originalClipboard)
      Object.defineProperty(navigator, "clipboard", originalClipboard)
    else Reflect.deleteProperty(navigator, "clipboard")
  })
  let clipboard: ReturnType<typeof useClipboard>
  function Harness(): null {
    clipboard = useClipboard()
    return null
  }
  let renderer: ReactTestRenderer
  await act(() => {
    renderer = create(createElement(Harness))
  })
  let first: Promise<void>
  await act(() => {
    first = clipboard.copy("old draft")
    clipboard.resetCopied()
  })
  await act(async () => {
    resolveWrite()
    await first
  })
  assert.equal(clipboard!.copied, false)
  let second: Promise<void>
  await act(() => {
    second = clipboard.copy("current draft")
  })
  await act(async () => {
    resolveWrite()
    await second
  })
  assert.equal(clipboard!.copied, true)
  await act(() => {
    context.mock.timers.tick(2000)
  })
  assert.equal(clipboard!.copied, false)
  let third: Promise<void>
  await act(() => {
    third = clipboard.copy("another draft")
  })
  await act(async () => {
    resolveWrite()
    await third
  })
  await act(() => {
    renderer.unmount()
  })
  await act(() => {
    context.mock.timers.tick(2000)
  })
})
