import type { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/db", () => ({
    default: {
        connect: vi.fn(),
        query: vi.fn()
    }
}))

vi.mock("../../src/utils/validators", () => ({
    hasExpense: vi.fn(),
    isUserAuthorised: vi.fn(),
    isValidSplit: vi.fn()
}))

vi.mock("../../src/utils/queries", () => ({
    getExpenses: vi.fn(),
    getGroupDetails: vi.fn(),
    getGroupIdByExpense: vi.fn(),
    getSplits: vi.fn()
}))

vi.mock("../../src/utils/currencyServices", async importOriginal => {
    const actual = await importOriginal<
    typeof import("../../src/utils/currencyServices")
    >()
    return {
        ...actual,
        getFxQuote: vi.fn()
    }
})

import database from "../../src/db"
import { FxUnavailableError, getFxQuote } from "../../src/utils/currencyServices"
import { getExpenses, getGroupDetails } from "../../src/utils/queries"
import { isUserAuthorised } from "../../src/utils/validators"
import {
    addExpense,
    deleteExpense,
    getExpenseDetail,
    getExpenseList
} from "../../src/controllers/expenseController"

const authorisedMock = vi.mocked(isUserAuthorised)
const getExpensesMock = vi.mocked(getExpenses)
const getGroupDetailsMock = vi.mocked(getGroupDetails)
const getFxQuoteMock = vi.mocked(getFxQuote)
const connectMock = vi.mocked(database.connect)
const queryMock = vi.mocked(database.query)
const clientQueryMock = vi.fn()
const releaseMock = vi.fn()
const GROUP_ID = "10000000-0000-4000-8000-000000000001"
const EXPENSE_ID = "20000000-0000-4000-8000-000000000002"

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

function createDeleteRequest(
    groupId = GROUP_ID,
    expenseId = EXPENSE_ID
) {
    return {
        params: { groupId, expenseId },
        user: { userId: "alice" }
    } as unknown as Request
}

function createDetailRequest(
    groupId = GROUP_ID,
    expenseId = EXPENSE_ID
) {
    return {
        params: { groupId, expenseId },
        user: { userId: "alice" }
    } as unknown as Request
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
    connectMock.mockResolvedValue({
        query: clientQueryMock,
        release: releaseMock
    } as never)
    getGroupDetailsMock.mockResolvedValue({
        groupName: "Group",
        defaultCurrency: "SGD"
    })
    getFxQuoteMock.mockResolvedValue({
        rate: "1",
        provider: "identity",
        effectiveAt: null
    })
})

describe("expense controller", () => {
    it("rejects a request with missing fields", async () => {
        const response = createResponse()

        await addExpense(createRequest({ groupId: "group-1" }), response)

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "VALIDATION_ERROR",
            message: "Invalid expense details"
        })
        expect(connectMock).not.toHaveBeenCalled()
    })

    it.each(["0", "-2", "not-a-number", "2.001", Number.POSITIVE_INFINITY])(
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
                code: "VALIDATION_ERROR",
                message: "Invalid expense details"
            })
            expect(connectMock).not.toHaveBeenCalled()
        }
    )

    it("rejects a user who is not a member of the group", async () => {
        authorisedMock.mockResolvedValue(false)
        const response = createResponse()

        await addExpense(createRequest(validExpense), response)

        expect(response.status).toHaveBeenCalledWith(403)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "FORBIDDEN",
            message: "User not in group or No such group"
        })
    })

    it("rejects payer or split totals that do not match the expense", async () => {
        authorisedMock.mockResolvedValue(true)
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
            code: "VALIDATION_ERROR",
            message: "Paid and split amounts must equal total"
        })
        expect(connectMock).not.toHaveBeenCalled()
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("rejects duplicate participants before authorization or connection", async () => {
        const response = createResponse()

        await addExpense(
            createRequest({
                ...validExpense,
                paidBy: [
                    { userId: "alice", amount: 10 },
                    { userId: "alice", amount: 20 }
                ]
            }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(authorisedMock).not.toHaveBeenCalled()
        expect(connectMock).not.toHaveBeenCalled()
    })

    it("rejects a participant who is not a current group member", async () => {
        authorisedMock
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false)
        const response = createResponse()

        await addExpense(createRequest(validExpense), response)

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "VALIDATION_ERROR",
            message: "Expense participant is not a group member"
        })
        expect(connectMock).not.toHaveBeenCalled()
    })

    it("creates an expense, payments, and splits in a transaction", async () => {
        authorisedMock.mockResolvedValue(true)
        clientQueryMock.mockImplementation(async query => {
            if (typeof query === "string" && query.includes("INSERT INTO expenses")) {
                return { rows: [{ id: "expense-1" }] } as never
            }
            return { rows: [] } as never
        })
        const response = createResponse()

        await addExpense(createRequest(validExpense), response)

        expect(clientQueryMock).toHaveBeenCalledWith("BEGIN")
        expect(clientQueryMock).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO expenses"),
            ["group-1", "Dinner", 30, "2026-07-28", "SGD"]
        )
        expect(clientQueryMock).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO expense_fx_snapshots"),
            [
                "expense-1",
                "group-1",
                "SGD",
                "SGD",
                "1",
                "identity",
                null
            ]
        )
        expect(clientQueryMock).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO payments"),
            ["expense-1", "group-1", "alice", 30]
        )
        expect(clientQueryMock).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO splits"),
            ["expense-1", "group-1", "alice", 15]
        )
        expect(clientQueryMock).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO splits"),
            ["expense-1", "group-1", "bob", 15]
        )
        expect(clientQueryMock).toHaveBeenCalledWith("COMMIT")
        expect(queryMock).not.toHaveBeenCalled()
        expect(releaseMock).toHaveBeenCalledOnce()
        expect(response.status).toHaveBeenCalledWith(201)
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                expenseId: "expense-1"
            }
        })
    })

    it.each([
        ["expense", "INSERT INTO expenses"],
        ["payment", "INSERT INTO payments"],
        ["split", "INSERT INTO splits"],
        ["FX snapshot", "INSERT INTO expense_fx_snapshots"]
    ])("rolls back and releases when the %s write fails", async (_stage, failureSql) => {
        authorisedMock.mockResolvedValue(true)
        clientQueryMock.mockImplementation(async query => {
            if (typeof query === "string" && query.includes(failureSql)) {
                throw new Error(`${failureSql} failed`)
            }
            if (
                typeof query === "string" &&
                query.includes("INSERT INTO expenses")
            ) {
                return { rows: [{ id: "expense-1" }] } as never
            }
            return { rows: [] } as never
        })
        const response = createResponse()

        await addExpense(createRequest(validExpense), response)

        expect(clientQueryMock).toHaveBeenCalledWith("ROLLBACK")
        expect(clientQueryMock).not.toHaveBeenCalledWith("COMMIT")
        expect(releaseMock).toHaveBeenCalledOnce()
        expect(response.status).toHaveBeenCalledWith(500)
    })

    it("gets cross-currency FX before connecting", async () => {
        authorisedMock.mockResolvedValue(true)
        getFxQuoteMock.mockResolvedValue({
            rate: "1.35",
            provider: "frankfurter",
            effectiveAt: "2026-07-30T00:00:00.000Z"
        })
        clientQueryMock.mockImplementation(async query => (
            typeof query === "string" && query.includes("INSERT INTO expenses")
                ? { rows: [{ id: "expense-1" }] }
                : { rows: [] }
        ))
        const response = createResponse()

        await addExpense(
            createRequest({ ...validExpense, expenseCurrency: "USD" }),
            response
        )

        expect(getFxQuoteMock).toHaveBeenCalledWith("USD", "SGD")
        expect(getFxQuoteMock.mock.invocationCallOrder[0]).toBeLessThan(
            connectMock.mock.invocationCallOrder[0]
        )
        expect(response.status).toHaveBeenCalledWith(201)
    })

    it("returns FX unavailable without opening a transaction", async () => {
        authorisedMock.mockResolvedValue(true)
        getFxQuoteMock.mockRejectedValue(
            new FxUnavailableError("Provider unavailable")
        )
        const response = createResponse()

        await addExpense(
            createRequest({ ...validExpense, expenseCurrency: "USD" }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(503)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "FX_UNAVAILABLE",
            message: "Exchange rate is unavailable"
        })
        expect(connectMock).not.toHaveBeenCalled()
    })

    it("serializes listed expense money as a two-decimal string", async () => {
        authorisedMock.mockResolvedValue(true)
        getExpensesMock.mockResolvedValue([{
            id: "expense-1",
            group_id: "group-1",
            name: "Dinner",
            total: "30.00",
            date: "2026-07-28",
            created_at: "2026-07-28T12:00:00.000Z",
            currency: "SGD"
        }])
        const response = createResponse()
        const request = {
            params: { groupId: "group-1" },
            user: { userId: "alice" }
        } as unknown as Request

        await getExpenseList(request, response)

        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                expenses: [{
                    expenseId: "expense-1",
                    groupId: "group-1",
                    expenseName: "Dinner",
                    expenseTotal: "30.00",
                    date: "2026-07-28",
                    createdAt: "2026-07-28T12:00:00.000Z",
                    currency: "SGD"
                }]
            }
        })
    })

    it("returns saved payer, split, and cross-currency FX details", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock
            .mockResolvedValueOnce({ rows: [{
                id: EXPENSE_ID,
                group_id: GROUP_ID,
                name: "Dinner",
                total: "30",
                date: "2026-07-28",
                created_at: "2026-07-28T12:00:00.000Z",
                currency: "USD",
                source_currency: "USD",
                target_currency: "SGD",
                rate: "1.350000000000",
                provider: "frankfurter",
                provider_effective_at: "2026-07-27T00:00:00.000Z",
                captured_at: "2026-07-28T12:00:00.000Z"
            }] } as never)
            .mockResolvedValueOnce({ rows: [
                { user_id: "alice", amount: "20" },
                { user_id: "bob", amount: "10.00" }
            ] } as never)
            .mockResolvedValueOnce({ rows: [
                { user_id: "alice", amount: "12" },
                { user_id: "bob", amount: "18.00" }
            ] } as never)
        const response = createResponse()

        await getExpenseDetail(createDetailRequest(), response)

        expect(queryMock).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("WHERE expense.id = $2 AND expense.group_id = $1"),
            [GROUP_ID, EXPENSE_ID]
        )
        expect(queryMock.mock.calls[1]?.[0]).toContain("FROM payments")
        expect(queryMock.mock.calls[2]?.[0]).toContain("FROM splits")
        expect(response.status).toHaveBeenCalledWith(200)
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                expense: {
                    expenseId: EXPENSE_ID,
                    groupId: GROUP_ID,
                    expenseName: "Dinner",
                    expenseTotal: "30.00",
                    date: "2026-07-28",
                    createdAt: "2026-07-28T12:00:00.000Z",
                    currency: "USD",
                    paidBy: [
                        { userId: "alice", amount: "20.00" },
                        { userId: "bob", amount: "10.00" }
                    ],
                    splits: [
                        { userId: "alice", amount: "12.00" },
                        { userId: "bob", amount: "18.00" }
                    ],
                    fxSnapshot: {
                        sourceCurrency: "USD",
                        targetCurrency: "SGD",
                        rate: "1.350000000000",
                        provider: "frankfurter",
                        effectiveAt: "2026-07-27T00:00:00.000Z",
                        capturedAt: "2026-07-28T12:00:00.000Z"
                    }
                }
            }
        })
        expect(getFxQuoteMock).not.toHaveBeenCalled()
    })

    it("returns identity FX facts for a same-currency expense", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock
            .mockResolvedValueOnce({ rows: [{
                id: EXPENSE_ID,
                group_id: GROUP_ID,
                name: "Lunch",
                total: "8.5",
                date: "2026-07-28",
                created_at: "2026-07-28T12:00:00.000Z",
                currency: "SGD",
                source_currency: "SGD",
                target_currency: "SGD",
                rate: "1.000000000000",
                provider: "identity",
                provider_effective_at: null,
                captured_at: "2026-07-28T12:00:00.000Z"
            }] } as never)
            .mockResolvedValueOnce({ rows: [{ user_id: "alice", amount: "8.5" }] } as never)
            .mockResolvedValueOnce({ rows: [{ user_id: "bob", amount: "8.5" }] } as never)
        const response = createResponse()

        await getExpenseDetail(createDetailRequest(), response)

        expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                expense: expect.objectContaining({
                    fxSnapshot: expect.objectContaining({
                        sourceCurrency: "SGD",
                        targetCurrency: "SGD",
                        rate: "1.000000000000",
                        provider: "identity",
                        effectiveAt: null
                    })
                })
            })
        }))
    })

    it.each([
        ["malformed group", "not-a-group", EXPENSE_ID],
        ["malformed expense", GROUP_ID, "not-an-expense"]
    ])("rejects %s detail identifiers", async (_case, groupId, expenseId) => {
        const response = createResponse()

        await getExpenseDetail(createDetailRequest(groupId, expenseId), response)

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "VALIDATION_ERROR",
            message: "Invalid expense"
        })
        expect(authorisedMock).not.toHaveBeenCalled()
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("denies a non-member before looking up an expense", async () => {
        authorisedMock.mockResolvedValue(false)
        const response = createResponse()

        await getExpenseDetail(createDetailRequest(), response)

        expect(response.status).toHaveBeenCalledWith(403)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "FORBIDDEN",
            message: "Forbidden"
        })
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("returns not found when the expense is absent from the authorized group", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock.mockResolvedValueOnce({ rows: [] } as never)
        const response = createResponse()

        await getExpenseDetail(createDetailRequest(), response)

        expect(queryMock).toHaveBeenCalledTimes(1)
        expect(response.status).toHaveBeenCalledWith(404)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "NOT_FOUND",
            message: "Expense not found"
        })
    })

    it("reports incomplete saved FX or allocation data as an integrity error", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock.mockResolvedValueOnce({ rows: [{
            id: EXPENSE_ID,
            group_id: GROUP_ID,
            name: "Dinner",
            total: "30.00",
            date: "2026-07-28",
            created_at: "2026-07-28T12:00:00.000Z",
            currency: "SGD",
            source_currency: null,
            target_currency: null,
            rate: null,
            provider: null,
            provider_effective_at: null,
            captured_at: null
        }] } as never)
        const response = createResponse()

        await getExpenseDetail(createDetailRequest(), response)

        expect(queryMock).toHaveBeenCalledTimes(1)
        expect(response.status).toHaveBeenCalledWith(500)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "DATA_INTEGRITY_ERROR",
            message: "Stored expense details are incomplete"
        })
    })

    it.each(["payment", "split"])(
        "rejects missing saved %s entries",
        async missingKind => {
            authorisedMock.mockResolvedValue(true)
            queryMock
                .mockResolvedValueOnce({ rows: [{
                    id: EXPENSE_ID,
                    group_id: GROUP_ID,
                    name: "Dinner",
                    total: "30.00",
                    date: "2026-07-28",
                    created_at: "2026-07-28T12:00:00.000Z",
                    currency: "SGD",
                    source_currency: "SGD",
                    target_currency: "SGD",
                    rate: "1.000000000000",
                    provider: "identity",
                    provider_effective_at: null,
                    captured_at: "2026-07-28T12:00:00.000Z"
                }] } as never)
                .mockResolvedValueOnce({ rows: missingKind === "payment"
                    ? []
                    : [{ user_id: "alice", amount: "30.00" }] } as never)
                .mockResolvedValueOnce({ rows: missingKind === "split"
                    ? []
                    : [{ user_id: "bob", amount: "30.00" }] } as never)
            const response = createResponse()

            await getExpenseDetail(createDetailRequest(), response)

            expect(response.status).toHaveBeenCalledWith(500)
            expect(response.json).toHaveBeenCalledWith({
                status: "fail",
                code: "DATA_INTEGRITY_ERROR",
                message: "Stored expense details are incomplete"
            })
        }
    )

    it("returns a stable error when a detail query fails", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock.mockRejectedValue(new Error("relation=expenses password=secret"))
        const response = createResponse()

        await getExpenseDetail(createDetailRequest(), response)

        expect(response.status).toHaveBeenCalledWith(500)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "INTERNAL_ERROR",
            message: "Server error getting expense details"
        })
    })

    it.each([
        ["missing group", "", EXPENSE_ID],
        ["malformed group", "not-a-group", EXPENSE_ID],
        ["missing expense", GROUP_ID, ""],
        ["malformed expense", GROUP_ID, "not-an-expense"]
    ])("rejects %s deletion identifiers", async (
        _case,
        groupId,
        expenseId
    ) => {
        const response = createResponse()

        await deleteExpense(
            createDeleteRequest(groupId, expenseId),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "VALIDATION_ERROR",
            message: "Invalid expense"
        })
        expect(authorisedMock).not.toHaveBeenCalled()
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("denies a non-member before querying expense existence", async () => {
        authorisedMock.mockResolvedValue(false)
        const response = createResponse()

        await deleteExpense(createDeleteRequest(), response)

        expect(response.status).toHaveBeenCalledWith(403)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "FORBIDDEN",
            message: "Forbidden"
        })
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("scopes deletion by group and returns missing without disclosure", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock.mockResolvedValue({ rows: [] } as never)
        const response = createResponse()

        await deleteExpense(createDeleteRequest(), response)

        expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining(
                "WHERE id = $1 AND group_id = $2"
            ),
            [EXPENSE_ID, GROUP_ID]
        )
        expect(response.status).toHaveBeenCalledWith(404)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "NOT_FOUND",
            message: "Expense not found"
        })
    })

    it("deletes an expense graph for an authorized group member", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock.mockResolvedValue({
            rows: [{ id: EXPENSE_ID }]
        } as never)
        const response = createResponse()

        await deleteExpense(createDeleteRequest(), response)

        expect(response.status).toHaveBeenCalledWith(200)
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: { expenseId: EXPENSE_ID }
        })
    })

    it("returns a stable error without database details", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock.mockRejectedValue(
            new Error("password=secret relation=expenses")
        )
        const response = createResponse()

        await deleteExpense(createDeleteRequest(), response)

        expect(response.status).toHaveBeenCalledWith(500)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "INTERNAL_ERROR",
            message: "Server error deleting expense"
        })
    })
})
