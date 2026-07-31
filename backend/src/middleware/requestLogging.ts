import { randomUUID } from "node:crypto"
import type { NextFunction, Request, RequestHandler, Response } from "express"

import { logger as defaultLogger, runWithRequestContext, type Logger } from "../logging/logger"

interface RequestLoggingOptions {
    logger?: Logger
    now?: () => number
    createRequestId?: () => string
}

const safeRequestId = /^[A-Za-z0-9._-]{1,100}$/

export function createRequestLoggingMiddleware(
    options: RequestLoggingOptions = {}
): RequestHandler {
    const logger = options.logger ?? defaultLogger
    const now = options.now ?? Date.now
    const createRequestId = options.createRequestId ?? randomUUID

    return (request: Request, response: Response, next: NextFunction) => {
        const incoming = request.headers["x-request-id"]
        const candidate = Array.isArray(incoming) ? incoming[0] : incoming
        const requestId = typeof candidate === "string" && safeRequestId.test(candidate)
            ? candidate
            : createRequestId()
        const startedAt = now()
        request.requestId = requestId
        response.setHeader("X-Request-Id", requestId)

        runWithRequestContext(requestId, () => {
            logger.info("request_started", { method: request.method })
            response.once("finish", () => {
                const route = request.route?.path
                logger.info("request_completed", {
                    method: request.method,
                    route: typeof route === "string"
                        ? `${request.baseUrl}${route}`
                        : "unmatched",
                    status: response.statusCode,
                    elapsedMs: Math.max(0, now() - startedAt)
                })
            })
            next()
        })
    }
}

export const requestLogging = createRequestLoggingMiddleware()
