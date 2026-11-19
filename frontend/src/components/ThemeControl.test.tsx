import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import ThemeControl from "./ThemeControl"
import { ThemeProvider } from "../theme/ThemeProvider"

function mountThemeControl() {
    return render(
        <ThemeProvider>
            <ThemeControl />
        </ThemeProvider>,
    )
}

describe("ThemeControl", () => {
    afterEach(() => {
        delete document.documentElement.dataset.theme
        document.documentElement.style.colorScheme = ""
    })

    it("applies and persists an explicit theme preference", () => {
        mountThemeControl()
        fireEvent.change(screen.getByRole("combobox", { name: "Color theme" }), {
            target: { value: "light" },
        })

        expect(document.documentElement.dataset.theme).toBe("light")
        expect(document.documentElement.style.colorScheme).toBe("light")
        expect(localStorage.getItem("kyisplit-theme")).toBe("light")
    })

    it("restores the saved preference on the next page load", () => {
        localStorage.setItem("kyisplit-theme", "light")
        mountThemeControl()

        expect(screen.getByRole("combobox", { name: "Color theme" })).toHaveValue("light")
        expect(document.documentElement.dataset.theme).toBe("light")
    })

    it("follows system changes when the preference is System", () => {
        let changeListener: (() => void) | undefined
        const media = {
            matches: false,
            addEventListener: vi.fn((_event: string, listener: () => void) => {
                changeListener = listener
            }),
            removeEventListener: vi.fn(),
        }
        vi.stubGlobal("matchMedia", vi.fn(() => media))
        mountThemeControl()

        expect(document.documentElement.dataset.theme).toBe("dark")
        media.matches = true
        act(() => changeListener?.())
        expect(document.documentElement.dataset.theme).toBe("light")
    })

    it("keeps the selected theme active when browser storage is unavailable", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new DOMException("Storage disabled")
        })
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new DOMException("Storage disabled")
        })
        mountThemeControl()

        fireEvent.change(screen.getByRole("combobox", { name: "Color theme" }), {
            target: { value: "light" },
        })
        expect(document.documentElement.dataset.theme).toBe("light")
    })
})
