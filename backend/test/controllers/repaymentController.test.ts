import type { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/db", () => ({
    default: {
        query: vi.fn()
    }
}))

vi.mock("../../src/utils/validators", () => ({
    isUserAuthorised: vi.fn()
}))

vi.mock("../../src/utils/queries", () => ({
    getGroupDetails: vi.fn()
}))

import database from "../../src/db"
import { getGroupDetails } from "../../src/utils/queries"
import { isUserAuthorised } from "../../src/utils/validators"
import {
    createRepayment,
    deleteRepayment,
    listRepayments
} from "../../src/controllers/repaymentController"

const ALICE = "11111111-1111-4111-8111-111111111111"
const BOB = "22222222-2222-4222-8222-222222222222"
const GROUP = "33333333-3333-4333-8333-333333333333"
const REPAYMENT = "44444444-4444-4444-8444-444444444444"

const authorisedMock = vi.mocked(isUserAuthorised)
const detailsMock = vi.mocked(getGroupDetails)
const queryMock = vi.mocked(database.query)

function createResponse() {
    const response = {
        json: vi.fn(),
        status: vi.fn()
    }
    response.status.mockReturnValue(response)
    return response as unknown as Response
}

function createRequest({
    body = {},
    groupId = GROUP,
    repaymentId = REPAYMENT,
    userId = ALICE
}: {
    body?: Record<string, unknown>
    groupId?: string
    repaymentId?: string
    userId?: string
} = {}) {
    return {
        body,
        params: { groupId, repaymentId },
        user: { userId }
    } as unknown as Request
}

const validBody = {
    payerUserId: ALICE,
    receiverUserId: BOB,
    amount: "12.30",
    repaymentDate: "2026-07-30"
}

beforeEach(() => {
    vi.clearAllMocks()
    detailsMock.mockResolvedValue({
        groupName: "Trip",
        defaultCurrency: "SGD"
    })
})

describe("repayment creation", () => {
    it.each([
        {},
        { ...validBody, payerUserId: "not-an-id" },
        { ...validBody, receiverUserId: "not-an-id" },
        { ...validBody, receiverUserId: ALICE },
        { ...validBody, amount: "0" },
        { ...validBody, amount: "-1" },
        { ...validBody, amount: "1.001" },
        { ...validBody, amount: Number.POSITIVE_INFINITY },
        { ...validBody, repaymentDate: "2026-02-30" }
    ])("rejects invalid input %# before membership or writes", async body => {
        const response = createResponse()

        await createRepayment(createRequest({ body }), response)

        expect(response.status).toHaveBeenCalledWith(400)
        expect(authorisedMock).not.toHaveBeenCalled()
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("denies a non-member before group or repayment queries", async () => {
        authorisedMock.mockResolvedValue(false)
        const response = createResponse()

        await createRepayment(
            createRequest({ body: validBody }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(403)
        expect(detailsMock).not.toHaveBeenCalled()
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("rejects a payer or receiver who is not a current member", async () => {
        authorisedMock
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false)
        const response = createResponse()

        await createRepayment(
            createRequest({ body: validBody }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("stores and returns a repayment in the group currency", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock.mockResolvedValue({
            rows: [{
                id: REPAYMENT,
                group_id: GROUP,
                payer_user_id: ALICE,
                receiver_user_id: BOB,
                amount: "12.30",
                currency: "SGD",
                repayment_date: "2026-07-30",
                recorded_by_user_id: ALICE,
                created_at: "2026-07-31T01:02:03.000Z"
            }]
        } as never)
        const response = createResponse()

        await createRepayment(
            createRequest({ body: validBody }),
            response
        )

        expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO repayments"),
            [
                GROUP,
                ALICE,
                BOB,
                "12.30",
                "SGD",
                "2026-07-30",
                ALICE
            ]
        )
        expect(response.status).toHaveBeenCalledWith(201)
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                repayment: {
                    repaymentId: REPAYMENT,
                    groupId: GROUP,
                    payerUserId: ALICE,
                    receiverUserId: BOB,
                    amount: "12.30",
                    currency: "SGD",
                    repaymentDate: "2026-07-30",
                    recordedByUserId: ALICE,
                    createdAt: "2026-07-31T01:02:03.000Z"
                }
            }
        })
    })
})

describe("repayment reads and deletion", () => {
    it("lists repayments in a stable order with serialized money", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock.mockResolvedValue({
            rows: [{
                id: REPAYMENT,
                group_id: GROUP,
                payer_user_id: ALICE,
                receiver_user_id: BOB,
                amount: "12.3",
                currency: "SGD",
                repayment_date: new Date("2026-07-30T00:00:00.000Z"),
                recorded_by_user_id: ALICE,
                created_at: new Date("2026-07-31T01:02:03.000Z")
            }]
        } as never)
        const response = createResponse()

        await listRepayments(createRequest(), response)

        expect(queryMock.mock.calls[0][0]).toEqual(expect.stringContaining(
            "ORDER BY repayment_date DESC, created_at DESC, id DESC"
        ))
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                repayments: [expect.objectContaining({
                    repaymentId: REPAYMENT,
                    amount: "12.30",
                    repaymentDate: "2026-07-30",
                    createdAt: "2026-07-31T01:02:03.000Z"
                })]
            }
        })
    })

    it.each([listRepayments, deleteRepayment])(
        "denies non-members before repayment lookup",
        async handler => {
            authorisedMock.mockResolvedValue(false)
            const response = createResponse()

            await handler(createRequest(), response)

            expect(response.status).toHaveBeenCalledWith(403)
            expect(queryMock).not.toHaveBeenCalled()
        }
    )

    it("scopes deletion by group and returns missing safely", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock.mockResolvedValue({ rows: [] } as never)
        const response = createResponse()

        await deleteRepayment(createRequest(), response)

        expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining(
                "WHERE id = $1 AND group_id = $2"
            ),
            [REPAYMENT, GROUP]
        )
        expect(response.status).toHaveBeenCalledWith(404)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "NOT_FOUND",
            message: "Repayment not found"
        })
    })

    it("deletes a repayment in the authorized group", async () => {
        authorisedMock.mockResolvedValue(true)
        queryMock.mockResolvedValue({
            rows: [{ id: REPAYMENT }]
        } as never)
        const response = createResponse()

        await deleteRepayment(createRequest(), response)

        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: { repaymentId: REPAYMENT }
        })
    })
})
