const WINDOW_MS = 10 * 60_000
const MAX_PER_WINDOW = 3
const DAY_MS = 24 * 60 * 60_000
const MAX_PER_DAY = 8
const MAX_TRACKED_IPS = 5000

/** Best-effort per-isolate limits; timestamps are never shared between workers. */
export class ContactRateLimiter {
  private readonly hits = new Map<string, number[]>()
  private readonly capacity: number

  constructor(capacity = MAX_TRACKED_IPS) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError("Rate limit capacity must be a positive integer.")
    }
    this.capacity = capacity
  }

  get size(): number {
    return this.hits.size
  }

  /** Record an allowed attempt, or return milliseconds until it can be retried. */
  check(ip: string, now = Date.now()): number | null {
    const active: number[] = []
    let windowCount = 0
    let firstWindowHit = now

    for (const timestamp of this.hits.get(ip) ?? []) {
      const age = now - timestamp
      if (age >= DAY_MS) continue

      active.push(timestamp)
      if (age < WINDOW_MS) {
        if (windowCount === 0) firstWindowHit = timestamp
        windowCount++
      }
    }

    // Keep daily precedence when both limits have been reached.
    if (active.length >= MAX_PER_DAY) {
      return DAY_MS - (now - (active[0] ?? now))
    }
    if (windowCount >= MAX_PER_WINDOW) {
      return WINDOW_MS - (now - firstWindowHit)
    }

    if (!this.hits.has(ip)) this.makeRoom(now)
    active.push(now)
    this.hits.set(ip, active)
    return null
  }

  private makeRoom(now: number): void {
    if (this.hits.size < this.capacity) return

    // Sweep only at capacity, and retain every IP that still has a live hit.
    for (const [ip, timestamps] of this.hits) {
      if (timestamps.every((timestamp) => now - timestamp >= DAY_MS)) {
        this.hits.delete(ip)
      }
    }

    // Bounded storage must eventually evict an active entry, but never reset
    // all visitors' counters just because one new visitor reaches capacity.
    if (this.hits.size >= this.capacity) {
      const oldestIp = this.hits.keys().next().value
      if (oldestIp !== undefined) this.hits.delete(oldestIp)
    }
  }
}

export const contactRateLimiter = new ContactRateLimiter()

export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")
  if (real) return real.trim()
  const forwarded = req.headers.get("x-forwarded-for")
  return forwarded ? (forwarded.split(",")[0] ?? "unknown").trim() : "unknown"
}
