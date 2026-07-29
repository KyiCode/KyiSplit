import { describe, expect, it, vi } from "vitest"

vi.mock("./queries", () => ({
    getExpenses: vi.fn(),
    getSplits: vi.fn(),
    getUsersInGroup: vi.fn()
}))

vi.mock("./validators", () => ({
    hasInvalidExpenses: vi.fn()
}))

vi.mock("./currencyServices", () => ({
    convertCurrency: vi.fn()
}))

import { MaxPriorityQueue } from "@datastructures-js/priority-queue"
import {
    computeLeastTransactions,
    initialiseMappings,
    populateHeap,
    populateMap
} from "./balanceServices"

describe("balance services", () => {
    it("initialises every member with a zero balance", () => {
        expect(initialiseMappings(["alice", "bob"])).toEqual(
            new Map([
                ["alice", 0],
                ["bob", 0]
            ])
        )
    })

    it("totals multiple payments and splits for each member", () => {
        const result = populateMap(
            ["alice", "bob"],
            [
                { user_id: "alice", amount: 20 },
                { user_id: "alice", amount: 5 }
            ],
            [
                { user_id: "alice", amount: 10 },
                { user_id: "bob", amount: 15 }
            ]
        )

        expect(result.payerBillMap.get("alice")).toBe(25)
        expect(result.owerBillMap.get("alice")).toBe(10)
        expect(result.owerBillMap.get("bob")).toBe(15)
    })

    it("separates debtors from receivers using their net balances", () => {
        const { receiverHeap, owerHeap } = populateHeap(
            ["alice", "bob", "charlie"],
            new Map([
                ["alice", 30],
                ["bob", 0],
                ["charlie", 0]
            ]),
            new Map([
                ["alice", 10],
                ["bob", 15],
                ["charlie", 5]
            ])
        )

        expect(receiverHeap.pop()).toEqual({ userId: "alice", amount: 20 })
        expect(owerHeap.pop()).toEqual({ userId: "bob", amount: 15 })
        expect(owerHeap.pop()).toEqual({ userId: "charlie", amount: 5 })
    })

    it("settles one debtor and one receiver", () => {
        const receivers = new MaxPriorityQueue<{ userId: string, amount: number }>(
            item => item.amount
        )
        const debtors = new MaxPriorityQueue<{ userId: string, amount: number }>(
            item => item.amount
        )
        receivers.push({ userId: "alice", amount: 12.5 })
        debtors.push({ userId: "bob", amount: 12.5 })

        expect(computeLeastTransactions(receivers, debtors)).toEqual([
            {
                payingUserId: "bob",
                receivingUserId: "alice",
                amount: 12.5
            }
        ])
    })

    it("settles several members without overpaying any receiver", () => {
        const { receiverHeap, owerHeap } = populateHeap(
            ["alice", "bob", "charlie"],
            new Map([
                ["alice", 30],
                ["bob", 0],
                ["charlie", 0]
            ]),
            new Map([
                ["alice", 10],
                ["bob", 15],
                ["charlie", 5]
            ])
        )

        const transactions = computeLeastTransactions(receiverHeap, owerHeap)

        expect(transactions).toHaveLength(2)
        expect(transactions.reduce((sum, item) => sum + item.amount, 0)).toBe(20)
        expect(transactions.every(item => item.receivingUserId === "alice")).toBe(true)
    })

    it("throws if debtors and receivers do not balance", () => {
        const receivers = new MaxPriorityQueue<{ userId: string, amount: number }>(
            item => item.amount
        )
        const debtors = new MaxPriorityQueue<{ userId: string, amount: number }>(
            item => item.amount
        )
        receivers.push({ userId: "alice", amount: 10 })

        expect(() => computeLeastTransactions(receivers, debtors)).toThrow(
            "Heap mismatch during settlement"
        )
    })
})
