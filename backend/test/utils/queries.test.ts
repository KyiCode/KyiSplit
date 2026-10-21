import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/db", () => ({
    default: {
        query: vi.fn()
    }
}))

import database from "../../src/db"
import { getExpenses } from "../../src/utils/queries"

const queryMock = vi.mocked(database.query)

beforeEach(() => {
    queryMock.mockReset()
})

describe("getExpenses", () => {
    it("orders activity by date, creation time, then id descending", async () => {
        const expenses = [
            {
                id: "expense-z",
                date: "2026-10-19",
                created_at: "2026-10-19T12:00:00.000Z"
            },
            {
                id: "expense-b",
                date: "2026-10-18",
                created_at: "2026-10-18T12:00:00.000Z"
            },
            {
                id: "expense-a",
                date: "2026-10-18",
                created_at: "2026-10-18T12:00:00.000Z"
            },
            {
                id: "expense-c",
                date: "2026-10-18",
                created_at: "2026-10-18T11:00:00.000Z"
            }
        ]
        queryMock.mockResolvedValue({ rows: expenses } as never)

        await expect(getExpenses("group-1")).resolves.toEqual(expenses)

        expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining(
                "ORDER BY date DESC, created_at DESC, id DESC"
            ),
            ["group-1"]
        )
    })
})
