import type { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
    default: {
        query: vi.fn()
    }
}))

vi.mock("../utils/validators", () => ({
    hasExpense: vi.fn(),
    hasUser: vi.fn(),
    isUserAuthorised: vi.fn(),
    isValidSplit: vi.fn()
}))

vi.mock("../utils/queries", () => ({
    getExpenses: vi.fn(),
    getGroupIdByExpense: vi.fn(),
    getSplits: vi.fn()
}))

import database from "../db"
import { hasUser, isUserAuthorised } from "../utils/validators"
import { addExpense } from "./expenseController"

const authorisedMock = vi.mocked(isUserAuthorised)
const hasUserMock = vi.mocked(hasUser)
const queryMock = vi.mocked(database.query)

function createResponse() {
    const response = {
        json: vi.fn(),
        status: vi.fn()
    }
    response.status.mockReturnValue(response)
    return response as unknown as Response
}

function createRequest(body: Record<string, unknown>) {
    return {
        body,
        user: { userId: "alice" }
    } as Request
}

const validExpense = {
    groupId: "group-1",
    expenseName: "Dinner",
    expenseTotal: "30",
    expenseDate: "2026-07-28",
    expenseCurrency: "SGD",
    paidBy: [{ userId: "alice", amount: 30 }],
    splits: [
        { userId: "alice", amount: 15 },
        { userId: "bob", amount: 15 }
    ]
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("expense controller", () => {
    it("rejects a request with missing fields", async () => {
        const response = createResponse()

        await addExpense(createRequest({ groupId: "group-1" }), response)

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            message: "bad request"
        })
    })

    it.each(["0", "-2", "not-a-number"])(
        "rejects invalid expense total %s",
        async expenseTotal => {
            const response = createResponse()

            await addExpense(
                createRequest({ ...validExpense, expenseTotal }),
                response
            )

            expect(response.status).toHaveBeenCalledWith(400)
            expect(response.json).toHaveBeenCalledWith({
                status: "fail",
                message: "Invalid expense amount"
            })
        }
    )

    it("rejects a user who is not a member of the group", async () => {
        authorisedMock.mockResolvedValue(false)
        const response = createResponse()

        await addExpense(createRequest(validExpense), response)

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            message: "User not in group or No such group"
        })
    })

    it("rejects payer or split totals that do not match the expense", async () => {
        authorisedMock.mockResolvedValue(true)
        hasUserMock.mockResolvedValue(true)
        const response = createResponse()

        await addExpense(
            createRequest({
                ...validExpense,
                paidBy: [{ userId: "alice", amount: 29 }]
            }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            message: "Paid/split amounts don't match total"
        })
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("creates an expense, payments, and splits in a transaction", async () => {
        authorisedMock.mockResolvedValue(true)
        hasUserMock.mockResolvedValue(true)
        queryMock.mockImplementation(async query => {
            if (typeof query === "string" && query.includes("INSERT INTO expenses")) {
                return { rows: [{ id: "expense-1" }] } as never
            }
            return { rows: [] } as never
        })
        const response = createResponse()

        await addExpense(createRequest(validExpense), response)

        expect(queryMock).toHaveBeenCalledWith("BEGIN")
        expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO expenses"),
            ["group-1", "Dinner", 30, "2026-07-28", "SGD"]
        )
        expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO payments"),
            ["expense-1", "alice", 30]
        )
        expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO splits"),
            ["expense-1", "alice", 15]
        )
        expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO splits"),
            ["expense-1", "bob", 15]
        )
        expect(queryMock).toHaveBeenCalledWith("COMMIT")
        expect(response.status).toHaveBeenCalledWith(201)
        expect(response.json).toHaveBeenCalledWith({ status: "success" })
    })
})
