import type { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../utils/validators", () => ({
    isUserAuthorised: vi.fn()
}))

vi.mock("../utils/balanceServices", () => ({
    calculateBalance: vi.fn()
}))

import { calculateBalance } from "../utils/balanceServices"
import { DataIntegrityError } from "../utils/currencyServices"
import { isUserAuthorised } from "../utils/validators"
import { getBalance } from "./balanceController"

const authorisedMock = vi.mocked(isUserAuthorised)
const balanceMock = vi.mocked(calculateBalance)

function createResponse() {
    const response = {
        json: vi.fn(),
        status: vi.fn()
    }
    response.status.mockReturnValue(response)
    return response as unknown as Response
}

function createRequest() {
    return {
        body: {},
        params: { groupId: "group-1" },
        user: { userId: "user-1" }
    } as unknown as Request
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("balance controller", () => {
    it("denies a non-member before balance or FX work", async () => {
        authorisedMock.mockResolvedValue(false)
        const response = createResponse()

        await getBalance(createRequest(), response)

        expect(response.status).toHaveBeenCalledWith(403)
        expect(balanceMock).not.toHaveBeenCalled()
    })

    it("calculates balances for a member", async () => {
        authorisedMock.mockResolvedValue(true)
        balanceMock.mockResolvedValue({
            currency: "SGD",
            balances: [],
            settlements: []
        })
        const response = createResponse()

        await getBalance(createRequest(), response)

        expect(balanceMock).toHaveBeenCalledWith("group-1")
        expect(response.status).toHaveBeenCalledWith(200)
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                currency: "SGD",
                balances: [],
                settlements: []
            }
        })
    })

    it("returns a safe data-integrity failure for a missing snapshot", async () => {
        authorisedMock.mockResolvedValue(true)
        balanceMock.mockRejectedValue(
            new DataIntegrityError("Missing FX snapshot for expense secret-id")
        )
        const response = createResponse()

        await getBalance(createRequest(), response)

        expect(response.status).toHaveBeenCalledWith(500)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "DATA_INTEGRITY_ERROR",
            message: "Stored balance data is incomplete"
        })
    })
})
