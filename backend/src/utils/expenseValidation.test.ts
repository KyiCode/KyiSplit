import { describe, expect, it } from "vitest"
import {
    parseExpenseInput,
    parseMoneyToCents
} from "./expenseValidation"

const validExpense = {
    groupId: "group-1",
    expenseName: " Dinner ",
    expenseTotal: "30.00",
    expenseDate: "2026-07-28",
    expenseCurrency: "sgd",
    paidBy: [{ userId: "alice", amount: 30 }],
    splits: [
        { userId: "alice", amount: "15.00" },
        { userId: "bob", amount: 15 }
    ]
}

describe("money parsing", () => {
    it.each([
        ["0", 0],
        ["1.20", 120],
        [0.1, 10],
        [12.34, 1234]
    ])("parses %p into integer cents", (input, cents) => {
        expect(parseMoneyToCents(input)).toBe(cents)
    })

    it.each([
        -1,
        "1.001",
        ".50",
        "1.",
        "not-money",
        Number.NaN,
        Number.POSITIVE_INFINITY,
        1.001
    ])("rejects invalid money %p", input => {
        expect(parseMoneyToCents(input)).toBeNull()
    })
})

describe("expense input parsing", () => {
    it("normalizes valid input and preserves a documented zero-entry policy", () => {
        const result = parseExpenseInput({
            ...validExpense,
            paidBy: [
                { userId: "alice", amount: 30 },
                { userId: "bob", amount: 0 }
            ]
        })

        expect(result).toEqual({
            ok: true,
            value: {
                groupId: "group-1",
                expenseName: "Dinner",
                expenseTotal: 30,
                expenseTotalCents: 3000,
                expenseDate: "2026-07-28",
                expenseCurrency: "SGD",
                paidBy: [
                    { userId: "alice", amount: 30, amountCents: 3000 },
                    { userId: "bob", amount: 0, amountCents: 0 }
                ],
                splits: [
                    { userId: "alice", amount: 15, amountCents: 1500 },
                    { userId: "bob", amount: 15, amountCents: 1500 }
                ]
            }
        })
    })

    it("accepts decimal inputs whose integer cents add exactly", () => {
        const result = parseExpenseInput({
            ...validExpense,
            expenseTotal: "0.30",
            paidBy: [
                { userId: "alice", amount: "0.10" },
                { userId: "bob", amount: "0.20" }
            ],
            splits: [{ userId: "alice", amount: "0.30" }]
        })

        expect(result.ok).toBe(true)
    })

    it.each([
        ["empty name", { expenseName: " " }],
        ["long name", { expenseName: "x".repeat(121) }],
        ["zero total", { expenseTotal: "0" }],
        ["excess precision", { expenseTotal: "30.001" }],
        ["non-finite total", { expenseTotal: Number.POSITIVE_INFINITY }],
        ["invalid date", { expenseDate: "2026-02-30" }],
        ["invalid date shape", { expenseDate: "28-07-2026" }],
        ["short currency", { expenseCurrency: "SG" }],
        ["non-letter currency", { expenseCurrency: "S1D" }]
    ])("rejects %s", (_case, override) => {
        expect(parseExpenseInput({ ...validExpense, ...override })).toEqual({
            ok: false,
            message: "Invalid expense details"
        })
    })

    it.each([
        ["non-array payers", { paidBy: "alice" }],
        ["empty payers", { paidBy: [] }],
        ["empty splits", { splits: [] }],
        ["invalid entry", { paidBy: [{ userId: "alice" }] }],
        [
            "duplicate payer",
            {
                paidBy: [
                    { userId: "alice", amount: 10 },
                    { userId: "alice", amount: 20 }
                ]
            }
        ],
        [
            "duplicate split",
            {
                splits: [
                    { userId: "alice", amount: 15 },
                    { userId: "alice", amount: 15 }
                ]
            }
        ]
    ])("rejects %s", (_case, override) => {
        expect(parseExpenseInput({ ...validExpense, ...override })).toEqual({
            ok: false,
            message: "Invalid payer or split entries"
        })
    })

    it("rejects payer or split cent totals that do not match", () => {
        expect(parseExpenseInput({
            ...validExpense,
            paidBy: [{ userId: "alice", amount: "29.99" }]
        })).toEqual({
            ok: false,
            message: "Paid and split amounts must equal total"
        })
    })
})
