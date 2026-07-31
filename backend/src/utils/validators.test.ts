import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
    default: {
        query: vi.fn()
    }
}))

vi.mock("./queries", () => ({
    getExpenses: vi.fn(),
    getExpenseTotal: vi.fn(),
    getSplits: vi.fn()
}))

import database from "../db"
import { getExpenseTotal } from "./queries"
import {
    hasAccount,
    hasExpense,
    hasUser,
    isUserAuthorised,
    isValidInvite,
    isValidSplit
} from "./validators"

const queryMock = vi.mocked(database.query)
const totalMock = vi.mocked(getExpenseTotal)

beforeEach(() => {
    queryMock.mockReset()
    totalMock.mockReset()
})

describe("validators", () => {
    it.each([
        ["isUserAuthorised", isUserAuthorised, ["user-1", "group-1"]],
        ["hasUser", hasUser, ["user-1"]],
        ["hasExpense", hasExpense, ["expense-1"]],
        ["hasAccount", hasAccount, ["person@example.com"]]
    ])("%s returns true when its query finds a row", async (_name, validator, args) => {
        queryMock.mockResolvedValue({ rows: [{}] } as never)

        await expect(validator(...args as [string, string])).resolves.toBe(true)
    })

    it("returns false when an expense does not exist", async () => {
        queryMock.mockResolvedValue({ rows: [] } as never)

        await expect(hasExpense("missing")).resolves.toBe(false)
    })

    it("accepts split totals within one cent of the expense total", async () => {
        totalMock.mockResolvedValue(10)

        await expect(
            isValidSplit("expense-1", [
                { userId: "alice", amount: 3.333 },
                { userId: "bob", amount: 6.667 }
            ])
        ).resolves.toBe(true)
    })

    it("rejects split totals that do not match the expense", async () => {
        totalMock.mockResolvedValue(10)

        await expect(
            isValidSplit("expense-1", [
                { userId: "alice", amount: 3 },
                { userId: "bob", amount: 6 }
            ])
        ).resolves.toBe(false)
    })

    it("handles an unknown invitation without throwing", async () => {
        queryMock.mockResolvedValue({ rows: [] } as never)

        await expect(isValidInvite(
            "missing",
            new Date("2026-07-31T02:00:00.000Z")
        )).resolves.toEqual({
            isValid: false,
            reason: "not_found"
        })
    })

    it("rejects an invitation at its expiration instant", async () => {
        queryMock.mockResolvedValue({
            rows: [{
                expires_at: new Date("2026-07-31T03:00:00.000Z"),
                group_id: "group-1"
            }]
        } as never)

        await expect(isValidInvite(
            "expired",
            new Date("2026-07-31T03:00:00.000Z")
        )).resolves.toEqual({
            isValid: false,
            reason: "expired"
        })
    })

    it("accepts an invitation before its expiration instant", async () => {
        queryMock.mockResolvedValue({
            rows: [{
                expires_at: new Date("2026-07-31T03:00:00.000Z"),
                group_id: "group-1"
            }]
        } as never)

        await expect(isValidInvite(
            "valid",
            new Date("2026-07-31T02:59:59.999Z")
        )).resolves.toEqual({
            isValid: true,
            groupId: "group-1"
        })
    })
})
