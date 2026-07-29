import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("./queries", () => ({
    getCurrency: vi.fn()
}))

import { getCurrency } from "./queries"
import { convertCurrency, getExchangeRate } from "./currencyServices"

const mockedGetCurrency = vi.mocked(getCurrency)

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("currency services", () => {
    it("returns one without fetching when currencies match", async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal("fetch", fetchMock)

        await expect(getExchangeRate("SGD", "SGD")).resolves.toBe(1)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("returns the exchange rate from Frankfurter", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({ rate: 1.35 })
        })
        vi.stubGlobal("fetch", fetchMock)

        await expect(getExchangeRate("USD", "SGD")).resolves.toBe(1.35)
        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.frankfurter.dev/v2/rate/USD/SGD"
        )
    })

    it("normalises payment amounts into the target currency", async () => {
        mockedGetCurrency
            .mockResolvedValueOnce("USD")
            .mockResolvedValueOnce("SGD")
        const fetchMock = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({ rate: 1.25 })
        })
        vi.stubGlobal("fetch", fetchMock)

        const result = await convertCurrency(
            [
                { expense_id: "expense-1", user_id: "alice", amount: 8 },
                { expense_id: "expense-2", user_id: "bob", amount: 4 }
            ],
            "SGD"
        )

        expect(result).toEqual([
            { user_id: "alice", amount: 10 },
            { user_id: "bob", amount: 4 }
        ])
    })

    it("propagates exchange-rate failures", async () => {
        mockedGetCurrency.mockResolvedValue("USD")
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))

        await expect(
            convertCurrency(
                [{ expense_id: "expense-1", user_id: "alice", amount: 8 }],
                "SGD"
            )
        ).rejects.toThrow("offline")
    })
})
