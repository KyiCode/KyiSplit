import { describe, expect, it } from "vitest"

import { DataIntegrityError } from "../../src/utils/currencyServices"
import {
    calculateDeterministicBalance,
    type BalanceDataset
} from "../../src/utils/balanceServices"

function expense(
    override: Partial<BalanceDataset["expenses"][number]> = {}
): BalanceDataset["expenses"][number] {
    return {
        expenseId: "expense-1",
        sourceCurrency: "SGD",
        targetCurrency: "SGD",
        total: "10.00",
        rate: "1",
        payments: [{ userId: "alice", amount: "10.00" }],
        splits: [{ userId: "bob", amount: "10.00" }],
        ...override
    }
}

describe("deterministic balance engine", () => {
    it("rounds half up and allocates largest remainders exactly", () => {
        const result = calculateDeterministicBalance({
            currency: "SGD",
            members: ["alice", "bob"],
            expenses: [expense({
                total: "0.03",
                rate: "0.5",
                sourceCurrency: "USD",
                payments: [{ userId: "alice", amount: "0.03" }],
                splits: [
                    { userId: "alice", amount: "0.01" },
                    { userId: "bob", amount: "0.02" }
                ]
            })],
            repayments: []
        })

        expect(result).toEqual({
            currency: "SGD",
            balances: [
                { userId: "alice", amount: "0.01" },
                { userId: "bob", amount: "-0.01" }
            ],
            settlements: [{
                payerUserId: "bob",
                receiverUserId: "alice",
                amount: "0.01"
            }]
        })
    })

    it("uses user ID ascending to break equal allocation remainders", () => {
        const result = calculateDeterministicBalance({
            currency: "SGD",
            members: ["bob", "alice"],
            expenses: [expense({
                total: "0.02",
                rate: "1.5",
                sourceCurrency: "USD",
                payments: [
                    { userId: "bob", amount: "0.01" },
                    { userId: "alice", amount: "0.01" }
                ],
                splits: [{ userId: "bob", amount: "0.02" }]
            })],
            repayments: []
        })

        expect(result.balances).toEqual([
            { userId: "alice", amount: "0.02" },
            { userId: "bob", amount: "-0.02" }
        ])
    })

    it("combines currencies, includes zero members, and applies repayments", () => {
        const dataset: BalanceDataset = {
            currency: "SGD",
            members: ["zero", "charlie", "alice", "bob"],
            expenses: [
                expense({
                    expenseId: "sgd",
                    total: "10.00",
                    payments: [{ userId: "alice", amount: "10.00" }],
                    splits: [
                        { userId: "bob", amount: "5.00" },
                        { userId: "charlie", amount: "5.00" }
                    ]
                }),
                expense({
                    expenseId: "usd",
                    sourceCurrency: "USD",
                    total: "4.00",
                    rate: "1.25",
                    payments: [{ userId: "bob", amount: "4.00" }],
                    splits: [
                        { userId: "alice", amount: "2.00" },
                        { userId: "charlie", amount: "2.00" }
                    ]
                })
            ],
            repayments: [{
                payerUserId: "charlie",
                receiverUserId: "alice",
                amount: "2.00",
                currency: "SGD"
            }]
        }

        expect(calculateDeterministicBalance(dataset)).toEqual({
            currency: "SGD",
            balances: [
                { userId: "alice", amount: "5.50" },
                { userId: "bob", amount: "0.00" },
                { userId: "charlie", amount: "-5.50" },
                { userId: "zero", amount: "0.00" }
            ],
            settlements: [{
                payerUserId: "charlie",
                receiverUserId: "alice",
                amount: "5.50"
            }]
        })
    })

    it("is byte-equivalent for shuffled input and repeated execution", () => {
        const ordered: BalanceDataset = {
            currency: "SGD",
            members: ["alice", "bob", "charlie", "dave"],
            expenses: [expense({
                total: "4.00",
                payments: [
                    { userId: "alice", amount: "2.00" },
                    { userId: "bob", amount: "2.00" }
                ],
                splits: [
                    { userId: "charlie", amount: "2.00" },
                    { userId: "dave", amount: "2.00" }
                ]
            })],
            repayments: []
        }
        const shuffled: BalanceDataset = {
            ...ordered,
            members: [...ordered.members].reverse(),
            expenses: ordered.expenses.map(item => ({
                ...item,
                payments: [...item.payments].reverse(),
                splits: [...item.splits].reverse()
            }))
        }

        const first = JSON.stringify(calculateDeterministicBalance(ordered))
        const second = JSON.stringify(calculateDeterministicBalance(shuffled))
        const repeated = JSON.stringify(
            calculateDeterministicBalance(ordered)
        )

        expect(second).toBe(first)
        expect(repeated).toBe(first)
        expect(JSON.parse(first).settlements).toEqual([
            {
                payerUserId: "charlie",
                receiverUserId: "alice",
                amount: "2.00"
            },
            {
                payerUserId: "dave",
                receiverUserId: "bob",
                amount: "2.00"
            }
        ])
    })

    it.each([
        [
            "missing FX",
            expense({ rate: null as unknown as string })
        ],
        [
            "wrong target",
            expense({ targetCurrency: "USD" })
        ],
        [
            "unbalanced payments",
            expense({
                payments: [{ userId: "alice", amount: "9.99" }]
            })
        ],
        [
            "unknown participant",
            expense({
                payments: [{ userId: "outsider", amount: "10.00" }]
            })
        ]
    ])("rejects contradictory stored data: %s", (_name, invalidExpense) => {
        expect(() => calculateDeterministicBalance({
            currency: "SGD",
            members: ["alice", "bob"],
            expenses: [invalidExpense],
            repayments: []
        })).toThrow(DataIntegrityError)
    })
})
