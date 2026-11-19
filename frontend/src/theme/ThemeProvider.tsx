import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react"
import { ThemeContext, type EffectiveTheme, type ThemePreference } from "./themeContext"

const STORAGE_KEY = "kyisplit-theme"
function readPreference(): ThemePreference {
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved === "light" || saved === "dark" || saved === "system") return saved
    } catch {
        // Theme selection still works for this page when storage is unavailable.
    }
    return "system"
}

function systemTheme(): EffectiveTheme {
    return window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)
    const [system, setSystem] = useState<EffectiveTheme>(systemTheme)
    const effectiveTheme = preference === "system" ? system : preference

    useEffect(() => {
        const media = window.matchMedia?.("(prefers-color-scheme: light)")
        if (!media) return
        const update = () => setSystem(media.matches ? "light" : "dark")
        media.addEventListener?.("change", update)
        return () => media.removeEventListener?.("change", update)
    }, [])

    useEffect(() => {
        document.documentElement.dataset.theme = effectiveTheme
        document.documentElement.style.colorScheme = effectiveTheme
        document.querySelector('meta[name="theme-color"]')?.setAttribute(
            "content",
            effectiveTheme === "light" ? "#f7f6f3" : "#0b0b0d",
        )
    }, [effectiveTheme])

    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next)
        try {
            window.localStorage.setItem(STORAGE_KEY, next)
        } catch {
            // The in-memory selection remains active until the page is closed.
        }
    }, [])

    const value = useMemo(
        () => ({ preference, setPreference, effectiveTheme }),
        [preference, setPreference, effectiveTheme],
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

