import assert from "node:assert/strict"
import test from "node:test"

import {
  isTheme,
  readStoredTheme,
  saveStoredTheme,
} from "../src/lib/theme-storage.ts"

test("theme storage preserves valid preferences and the requested storage key", () => {
  const values = new Map<string, string>([["portfolio-theme", "light"]])
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }

  assert.equal(
    readStoredTheme("portfolio-theme", "dark", () => storage),
    "light"
  )
  assert.equal(
    saveStoredTheme("portfolio-theme", "dark", () => storage),
    true
  )
  assert.equal(
    readStoredTheme("portfolio-theme", "light", () => storage),
    "dark"
  )
  assert.equal(
    readStoredTheme("other-theme", "light", () => storage),
    "light"
  )
})

test("missing or invalid persisted themes fall back without coercion", () => {
  for (const value of [null, "", "system", "Dark", " light "]) {
    assert.equal(
      readStoredTheme("theme", "light", () => ({
        getItem: () => value,
        setItem: () => {},
      })),
      "light"
    )
    assert.equal(isTheme(value), false)
  }
  assert.equal(isTheme({ toString: () => "dark" }), false)
})

test("blocked storage access never interrupts reading or saving a theme", () => {
  const blockedStorage = () => {
    throw new Error("Storage access is blocked")
  }

  assert.equal(readStoredTheme("theme", "dark", blockedStorage), "dark")
  assert.equal(saveStoredTheme("theme", "light", blockedStorage), false)
})

test("storage read and quota failures preserve the in-memory fallback", () => {
  const storage = {
    getItem: (): never => {
      throw new Error("Storage read failed")
    },
    setItem: (): never => {
      throw new Error("Storage quota exceeded")
    },
  }

  assert.equal(
    readStoredTheme("theme", "light", () => storage),
    "light"
  )
  assert.equal(
    saveStoredTheme("theme", "dark", () => storage),
    false
  )
})
