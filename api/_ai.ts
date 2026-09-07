import { type ModelMessage, smoothStream, streamText } from "ai"
import { getModel } from "./_lib"

type GenerationOptions = {
  system: string
  temperature: number
  maxOutputTokens: number
} & (
  | { prompt: string; messages?: never }
  | { messages: ModelMessage[]; prompt?: never }
)

/** Shared generation policy. Retries apply only before generation has started. */
export async function createAIResponse(
  req: Request,
  options: GenerationOptions
): Promise<Response> {
  const controller = new AbortController()
  const result = streamText({
    ...options,
    model: getModel(),
    // The SDK implements exponential backoff and honors provider retry headers.
    maxRetries: 2,
    timeout: { totalMs: 60_000, firstChunkMs: 20_000, chunkMs: 15_000 },
    abortSignal: AbortSignal.any([req.signal, controller.signal]),
    experimental_transform: smoothStream({ chunking: "word" }),
  })
  const text = result.fullStream.pipeThrough(
    new TransformStream({
      transform(part, output) {
        if (part.type === "text-delta") output.enqueue(part.text)
        else if (part.type === "error") throw part.error
        else if (part.type === "abort")
          throw new Error("The model request was cancelled or timed out.")
      },
    })
  )
  return textStreamResponse(text, () => controller.abort())
}

/** Wait for the first chunk so pre-stream failures still become JSON 502s. */
export async function textStreamResponse(
  stream: ReadableStream<string>,
  abort: () => void
): Promise<Response> {
  const reader = stream.getReader()
  let first: Awaited<ReturnType<typeof reader.read>>
  try {
    first = await reader.read()
  } catch (error) {
    abort()
    reader.releaseLock()
    throw error
  }
  const encoder = new TextEncoder()
  if (first.done) {
    reader.releaseLock()
    return new Response("", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    })
  }
  const body = new ReadableStream<Uint8Array>({
    start(output) {
      output.enqueue(encoder.encode(first.value))
    },
    async pull(output) {
      try {
        const chunk = await reader.read()
        if (chunk.done) {
          reader.releaseLock()
          output.close()
        } else {
          output.enqueue(encoder.encode(chunk.value))
        }
      } catch (error) {
        abort()
        reader.releaseLock()
        output.error(error)
      }
    },
    cancel(reason) {
      abort()
      // AI SDK tees its stream; abort the generation without waiting for the
      // other branch to drain before releasing this consumer's lock.
      void reader.cancel(reason).catch(() => undefined)
      reader.releaseLock()
    },
  })
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
