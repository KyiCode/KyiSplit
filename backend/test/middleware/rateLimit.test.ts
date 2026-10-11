import type { NextFunction, Request, Response } from "express"
import { describe, expect, it, vi } from "vitest"

import { createRateLimiter } from "../../src/middleware/rateLimit"

function createRequest(ip: string) {
    return {
        ip,
        socket: { remoteAddress: "127.0.0.1" }
    } as Request
}

function createResponse() {
    const response = {
        json: vi.fn(),
        setHeader: vi.fn(),
        status: vi.fn()
    }
    response.status.mockReturnValue(response)
    return response as unknown as Response
}

describe("authentication rate limiter storage", () => {
    it("expires an idle client's window when another client arrives", () => {
        let timestamp = 0
        const limiter = createRateLimiter({
            maxAttempts: 1,
            windowMs: 1000,
            maxEntries: 2,
            now: () => timestamp
        })
        const inactiveResponse = createResponse()
        const inactiveNext = vi.fn() as NextFunction
        limiter(createRequest("client-a"), inactiveResponse, inactiveNext)
        limiter(createRequest("client-b"), createResponse(), vi.fn())

        timestamp = 1000
        const newClientResponse = createResponse()
        const newClientNext = vi.fn() as NextFunction
        limiter(createRequest("client-c"), newClientResponse, newClientNext)

        expect(inactiveNext).toHaveBeenCalledOnce()
        expect(newClientNext).toHaveBeenCalledOnce()
        expect(newClientResponse.status).not.toHaveBeenCalled()
    })

    it("fails closed at capacity without dropping active client windows", () => {
        let timestamp = 0
        const limiter = createRateLimiter({
            maxAttempts: 1,
            windowMs: 60_000,
            maxEntries: 2,
            now: () => timestamp
        })
        for (const ip of ["client-a", "client-b"]) {
            limiter(createRequest(ip), createResponse(), vi.fn())
        }

        const overflowResponse = createResponse()
        const overflowNext = vi.fn() as NextFunction
        limiter(createRequest("client-c"), overflowResponse, overflowNext)

        expect(overflowResponse.status).toHaveBeenCalledWith(429)
        expect(overflowResponse.setHeader).toHaveBeenCalledWith("Retry-After", 60)
        expect(overflowNext).not.toHaveBeenCalled()

        for (const ip of ["client-a", "client-b"]) {
            const response = createResponse()
            const next = vi.fn() as NextFunction
            limiter(createRequest(ip), response, next)
            expect(response.status).toHaveBeenCalledWith(429)
            expect(next).not.toHaveBeenCalled()
        }
    })
})
