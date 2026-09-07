export type Theme = "dark" | "light"

type ThemeStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

type GetStorage = () => ThemeStorage

const browserStorage: GetStorage = () => localStorage

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light"
}

export function readStoredTheme(
  storageKey: string,
  fallback: Theme,
  getStorage: GetStorage = browserStorage
): Theme {
  try {
    const storedTheme = getStorage().getItem(storageKey)
    return isTheme(storedTheme) ? storedTheme : fallback
  } catch {
    // Storage may be blocked by browser privacy settings; rendering still works.
    return fallback
  }
}

export function saveStoredTheme(
  storageKey: string,
  theme: Theme,
  getStorage: GetStorage = browserStorage
): boolean {
  try {
    getStorage().setItem(storageKey, theme)
    return true
  } catch {
    // Persistence is optional. The active theme stays in React state.
    return false
  }
}
