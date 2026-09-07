import assert from "node:assert/strict"
import test from "node:test"

import { clientIp, ContactRateLimiter } from "../api/_rate-limit.ts"

const TEN_MINUTES = 10 * 60_000
const ONE_DAY = 24 * 60 * 60_000

test("allows three requests per window and does not count blocked attempts", () => {
  const limiter = new ContactRateLimiter()

  assert.equal(limiter.check("visitor", 0), null)
  assert.equal(limiter.check("visitor", 100), null)
  assert.equal(limiter.check("visitor", 200), null)
  assert.equal(limiter.check("visitor", 300), TEN_MINUTES - 300)
  assert.equal(limiter.check("visitor", TEN_MINUTES - 1), 1)
  assert.equal(limiter.check("visitor", TEN_MINUTES), null)
  assert.equal(limiter.check("visitor", TEN_MINUTES + 1), 99)
  assert.equal(limiter.check("visitor", TEN_MINUTES + 100), null)
})

test("allows eight daily requests and expires hits at the exact day boundary", () => {
  const limiter = new ContactRateLimiter()
  for (let index = 0; index < 8; index++) {
    assert.equal(limiter.check("visitor", index * TEN_MINUTES), null)
  }

  assert.equal(
    limiter.check("visitor", 8 * TEN_MINUTES),
    ONE_DAY - 8 * TEN_MINUTES
  )
  assert.equal(limiter.check("visitor", ONE_DAY - 1), 1)
  assert.equal(limiter.check("visitor", ONE_DAY), null)
  assert.equal(limiter.check("visitor", ONE_DAY + 1), TEN_MINUTES - 1)
  assert.equal(limiter.check("visitor", ONE_DAY + TEN_MINUTES), null)
})

test("daily retry takes precedence when both limits are reached", () => {
  const limiter = new ContactRateLimiter()
  for (let index = 0; index < 5; index++) {
    assert.equal(limiter.check("visitor", index * TEN_MINUTES), null)
  }
  const burstAt = 5 * TEN_MINUTES
  for (let index = 0; index < 3; index++) {
    assert.equal(limiter.check("visitor", burstAt), null)
  }

  assert.equal(limiter.check("visitor", burstAt), ONE_DAY - burstAt)
})

test("one IP's exhausted limit does not affect another IP", () => {
  const limiter = new ContactRateLimiter()
  for (let index = 0; index < 3; index++) {
    assert.equal(limiter.check("first", 0), null)
  }

  assert.equal(limiter.check("first", 0), TEN_MINUTES)
  assert.equal(limiter.check("second", 0), null)
  assert.equal(limiter.check("first", 0), TEN_MINUTES)
})

test("capacity eviction preserves other active visitors' counters", () => {
  const limiter = new ContactRateLimiter(3)
  for (const ip of ["oldest", "second", "third"]) {
    for (let index = 0; index < 3; index++) {
      assert.equal(limiter.check(ip, 0), null)
    }
  }

  assert.equal(limiter.check("new", 1), null)
  assert.equal(limiter.size, 3)
  assert.equal(limiter.check("second", 1), TEN_MINUTES - 1)
  assert.equal(limiter.check("third", 1), TEN_MINUTES - 1)
  assert.equal(limiter.check("oldest", 1), null)
  assert.equal(limiter.size, 3)
})

test("capacity pruning removes expired IPs before evicting an active IP", () => {
  const limiter = new ContactRateLimiter(2)
  assert.equal(limiter.check("oldest-active", 0), null)
  assert.equal(limiter.check("expired", 0), null)
  for (let index = 0; index < 3; index++) {
    assert.equal(limiter.check("oldest-active", ONE_DAY - 1), null)
  }

  assert.equal(limiter.check("new", ONE_DAY), null)
  assert.equal(limiter.size, 2)
  assert.equal(limiter.check("oldest-active", ONE_DAY), TEN_MINUTES - 1)
})

test("rejects invalid capacity values", () => {
  for (const capacity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => new ContactRateLimiter(capacity), RangeError)
  }
})

test("client IP prefers the real-IP header and then the first forwarded address", () => {
  const request = (headers: Record<string, string>) =>
    new Request("https://portfolio.example/api/contact", { headers })

  assert.equal(
    clientIp(
      request({ "x-real-ip": " 192.0.2.1 ", "x-forwarded-for": "192.0.2.2" })
    ),
    "192.0.2.1"
  )
  assert.equal(
    clientIp(request({ "x-forwarded-for": " 2001:db8::1 , 192.0.2.2" })),
    "2001:db8::1"
  )
  assert.equal(clientIp(request({})), "unknown")
  assert.equal(
    clientIp(request({ "x-real-ip": "", "x-forwarded-for": "192.0.2.2" })),
    "192.0.2.2"
  )
})
