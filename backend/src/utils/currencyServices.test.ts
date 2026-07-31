import { afterEach, describe, expect, it, vi } from "vitest"

import {
    FxUnavailableError,
    getFxQuote
} from "./currencyServices"

afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
})

describe("FX provider", () => {
    it("returns identity without fetching when currencies match", async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal("fetch", fetchMock)

        await expect(getFxQuote("SGD", "SGD")).resolves.toEqual({
            rate: "1",
            provider: "identity",
            effectiveAt: null
        })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("validates and returns a Frankfurter quote", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                rate: 1.35,
                date: "2026-07-30"
            })
        })
        vi.stubGlobal("fetch", fetchMock)

        await expect(getFxQuote("USD", "SGD")).resolves.toEqual({
            rate: "1.35",
            provider: "frankfurter",
            effectiveAt: "2026-07-30T00:00:00.000Z"
        })
        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.frankfurter.dev/v2/rate/USD/SGD"
        )
    })

    it.each([
        [{ ok: false, json: vi.fn() }],
        [{ ok: true, json: vi.fn().mockResolvedValue({}) }],
        [{ ok: true, json: vi.fn().mockResolvedValue({ rate: 0 }) }],
        [{ ok: true, json: vi.fn().mockResolvedValue({ rate: -1 }) }],
        [{ ok: true, json: vi.fn().mockResolvedValue({ rate: "NaN" }) }],
        [{ ok: true, json: vi.fn().mockRejectedValue(new Error("bad json")) }]
    ])("maps malformed provider response %# to FX unavailable", async response => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response))

        await expect(getFxQuote("USD", "SGD")).rejects.toBeInstanceOf(
            FxUnavailableError
        )
    })

    it("maps provider network failure to FX unavailable", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))

        await expect(getFxQuote("USD", "SGD")).rejects.toBeInstanceOf(
            FxUnavailableError
        )
    })
})
