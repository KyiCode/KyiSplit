import { afterEach, describe, expect, it, vi } from "vitest"

import {
    FxUnavailableError,
    getFxQuote
} from "../../src/utils/currencyServices"

afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
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
            "https://api.frankfurter.dev/v2/rate/USD/SGD",
            { signal: expect.any(AbortSignal) }
        )
    })

    it("uses an explicitly configured provider endpoint", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                rate: 1.35,
                date: "2026-07-30"
            })
        })
        vi.stubGlobal("fetch", fetchMock)

        await getFxQuote("USD", "SGD", {
            RATE_PROVIDER_URL: "http://127.0.0.1:5512",
            FX_PROVIDER_TIMEOUT_MS: "2000"
        })

        expect(fetchMock).toHaveBeenCalledWith(
            "http://127.0.0.1:5512/v2/rate/USD/SGD",
            { signal: expect.any(AbortSignal) }
        )
    })

    it("aborts a stalled provider request at the configured deadline", async () => {
        vi.useFakeTimers()
        let signal: AbortSignal | undefined
        vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => {
            signal = options.signal as AbortSignal
            return new Promise((_resolve, reject) => {
                signal?.addEventListener("abort", () => reject(new Error("aborted")))
            })
        }))

        const quote = getFxQuote("USD", "SGD", {
            FX_PROVIDER_TIMEOUT_MS: "100"
        })
        const rejection = expect(quote).rejects.toBeInstanceOf(FxUnavailableError)
        await vi.advanceTimersByTimeAsync(100)
        await rejection
        expect(signal?.aborted).toBe(true)
        vi.useRealTimers()
    })

    it("keeps the timeout active while reading the provider response body", async () => {
        vi.useFakeTimers()
        let signal: AbortSignal | undefined
        vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => {
            signal = options.signal as AbortSignal
            return Promise.resolve({
                ok: true,
                json: () => new Promise(() => undefined)
            })
        }))

        const quote = getFxQuote("USD", "SGD", {
            FX_PROVIDER_TIMEOUT_MS: "100"
        })
        const rejection = expect(quote).rejects.toBeInstanceOf(FxUnavailableError)
        await vi.advanceTimersByTimeAsync(100)
        await rejection
        expect(signal?.aborted).toBe(true)
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
