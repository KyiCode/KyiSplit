import { EventEmitter } from "node:events"
import type { NextFunction, Request, Response } from "express"
import { describe, expect, it, vi } from "vitest"

import { createLogger } from "../../src/logging/logger"
import { createRequestLoggingMiddleware } from "../../src/middleware/requestLogging"

describe("request logging middleware", () => {
    it("correlates start and completion without logging the raw URL", () => {
        const sink = vi.fn()
        const logger = createLogger({ level: "debug", sink })
        const middleware = createRequestLoggingMiddleware({
            logger,
            now: (() => {
                let value = 100
                return () => (value += 25)
            })(),
            createRequestId: () => "generated-request"
        })
        const request = {
            method: "POST",
            headers: {},
            originalUrl: "/api/groups/join/secret-invite-token",
            route: { path: "/join/:token" },
            baseUrl: "/api/groups"
        } as unknown as Request
        const response = Object.assign(new EventEmitter(), {
            statusCode: 201,
            setHeader: vi.fn()
        }) as unknown as Response
        const next = vi.fn() as NextFunction

        middleware(request, response, next)
        response.emit("finish")

        expect(next).toHaveBeenCalledOnce()
        expect(request.requestId).toBe("generated-request")
        expect(response.setHeader).toHaveBeenCalledWith(
            "X-Request-Id",
            "generated-request"
        )
        const output = sink.mock.calls.map(call => call[0]).join("\n")
        expect(output).toContain("generated-request")
        expect(output).toContain("/api/groups/join/:token")
        expect(output).not.toContain("secret-invite-token")
    })

    it("reuses only a safe incoming request ID", () => {
        const sink = vi.fn()
        const middleware = createRequestLoggingMiddleware({
            logger: createLogger({ level: "debug", sink }),
            createRequestId: () => "generated-request"
        })
        const request = {
            method: "GET",
            headers: { "x-request-id": "trusted_123" },
            route: { path: "/verifysession" },
            baseUrl: "/api/users"
        } as unknown as Request
        const response = Object.assign(new EventEmitter(), {
            statusCode: 200,
            setHeader: vi.fn()
        }) as unknown as Response

        middleware(request, response, vi.fn())

        expect(request.requestId).toBe("trusted_123")
    })
})
