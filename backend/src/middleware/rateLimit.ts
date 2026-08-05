import type { NextFunction, Request, RequestHandler, Response } from "express"

export interface RateLimitOptions {
    maxAttempts: number
    windowMs: number
    now?: () => number
}

interface AttemptWindow {
    count: number
    resetAt: number
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
    const attempts = new Map<string, AttemptWindow>()
    const now = options.now ?? Date.now

    return (request: Request, response: Response, next: NextFunction) => {
        const timestamp = now()
        const key = request.ip || request.socket.remoteAddress || "unknown"
        const current = attempts.get(key)
        const window = !current || current.resetAt <= timestamp
            ? { count: 0, resetAt: timestamp + options.windowMs }
            : current

        window.count += 1
        attempts.set(key, window)

        if (window.count > options.maxAttempts) {
            response.setHeader(
                "Retry-After",
                Math.max(1, Math.ceil((window.resetAt - timestamp) / 1000))
            )
            response.status(429).json({
                status: "fail",
                code: "RATE_LIMITED",
                message: "Too many attempts"
            })
            return
        }

        next()
    }
}
