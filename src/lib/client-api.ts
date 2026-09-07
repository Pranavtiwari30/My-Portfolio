import { contactResponseSchema, errorResponseSchema } from "./validation"
import { readTextStream } from "./text-stream"

/** Non-JSON errors (for example a proxy's HTML error page) use a safe fallback. */
export async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    if (error instanceof SyntaxError) return null
    throw error
  }
}

export function apiErrorMessage(payload: unknown, fallback: string): string {
  const result = errorResponseSchema.safeParse(payload)
  return result.success ? result.data.error : fallback
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError") {
      return "The request timed out. Please try again."
    }
    return error.message || "Something went wrong."
  }
  return "Something went wrong."
}

export async function postJson(
  endpoint: string,
  body: unknown,
  signal: AbortSignal
): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
}

export async function requestTextStream(
  endpoint: string,
  body: unknown,
  signal: AbortSignal,
  onText: (text: string) => void
): Promise<string> {
  const response = await postJson(endpoint, body, signal)
  signal.throwIfAborted()
  if (!response.ok || !response.body) {
    const payload = await readJsonResponse(response)
    signal.throwIfAborted()
    throw new Error(
      apiErrorMessage(payload, `Request failed (${response.status}).`)
    )
  }
  return readTextStream(response.body, signal, onText)
}

export async function requireContactSuccess(response: Response): Promise<void> {
  const payload = await readJsonResponse(response)
  if (!response.ok || !contactResponseSchema.safeParse(payload).success) {
    throw new Error(
      apiErrorMessage(payload, `Couldn't send (${response.status}).`)
    )
  }
}
