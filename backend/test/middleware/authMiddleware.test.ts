import type { NextFunction, Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/db", () => ({
    default: {
        query: vi.fn()
    }
}))

vi.mock("jsonwebtoken", () => ({
    default: {
        verify: vi.fn()
    }
}))

vi.mock("../../src/config", () => ({
    readAuthConfig: vi.fn(() => ({
        bcryptCost: 10,
        isProduction: false,
        jwtKey: "test-key"
    }))
}))

import jwt from "jsonwebtoken"
import database from "../../src/db"
import authMiddleware from "../../src/middleware/authMiddleware"

const queryMock = vi.mocked(database.query)
const verifyMock = vi.mocked(jwt.verify)

function createResponse() {
    const response = {
        json: vi.fn(),
        status: vi.fn()
    }
    response.status.mockReturnValue(response)
    return response as unknown as Response
}

function createRequest(cookie?: string, authorization?: string) {
    return {
        cookies: cookie ? { jwt: cookie } : {},
        headers: authorization ? { authorization } : {}
    } as Request
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("auth middleware", () => {
    it("rejects a missing cookie", async () => {
        const response = createResponse()
        const next = vi.fn() as NextFunction

        await authMiddleware(createRequest(), response, next)

        expect(response.status).toHaveBeenCalledWith(401)
        expect(verifyMock).not.toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
    })

    it("does not accept a bearer token in place of the browser cookie", async () => {
        const response = createResponse()
        const next = vi.fn() as NextFunction

        await authMiddleware(
            createRequest(undefined, "Bearer signed-token"),
            response,
            next
        )

        expect(response.status).toHaveBeenCalledWith(401)
        expect(verifyMock).not.toHaveBeenCalled()
    })

    it("rejects an invalid or expired token", async () => {
        verifyMock.mockImplementation(() => {
            throw new Error("expired")
        })
        const response = createResponse()

        await authMiddleware(createRequest("expired"), response, vi.fn())

        expect(response.status).toHaveBeenCalledWith(401)
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("rejects a session for a deleted user", async () => {
        verifyMock.mockReturnValue({ userId: "deleted-user" } as never)
        queryMock.mockResolvedValue({ rows: [] } as never)
        const response = createResponse()
        const next = vi.fn() as NextFunction

        await authMiddleware(createRequest("valid-token"), response, next)

        expect(response.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    it("sets user identity and continues for a valid cookie session", async () => {
        verifyMock.mockReturnValue({ userId: "user-1" } as never)
        queryMock.mockResolvedValue({ rows: [{ id: "user-1" }] } as never)
        const request = createRequest("valid-token")
        const response = createResponse()
        const next = vi.fn() as NextFunction

        await authMiddleware(request, response, next)

        expect(verifyMock).toHaveBeenCalledWith("valid-token", "test-key")
        expect(request.user).toEqual({ userId: "user-1" })
        expect(next).toHaveBeenCalledOnce()
    })
})
