import { createContext } from "react"

export type ThemePreference = "system" | "light" | "dark"
export type EffectiveTheme = Exclude<ThemePreference, "system">

export type ThemeContextValue = {
    preference: ThemePreference
    setPreference: (next: ThemePreference) => void
    effectiveTheme: EffectiveTheme
}

const defaultThemeContext: ThemeContextValue = {
    preference: "system",
    setPreference: () => undefined,
    effectiveTheme: "dark",
}

export const ThemeContext = createContext(defaultThemeContext)
