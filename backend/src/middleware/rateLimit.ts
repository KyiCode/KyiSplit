import type { NextFunction, Request, RequestHandler, Response } from "express"

export interface RateLimitOptions {
    maxAttempts: number
    windowMs: number
    maxEntries?: number
    now?: () => number
}

const DEFAULT_MAX_ENTRIES = 10_000
const CLEANUP_INTERVAL_MS = 60_000

interface AttemptWindow {
    count: number
    resetAt: number
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
    const attempts = new Map<string, AttemptWindow>()
    const now = options.now ?? Date.now
    const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
        throw new Error("maxEntries must be a positive integer")
    }
    let nextCleanupAt = 0

    return (request: Request, response: Response, next: NextFunction) => {
        const timestamp = now()
        const key = request.ip || request.socket.remoteAddress || "unknown"
        if (timestamp >= nextCleanupAt || attempts.size >= maxEntries) {
            for (const [client, window] of attempts) {
                if (window.resetAt <= timestamp) attempts.delete(client)
            }
            nextCleanupAt = timestamp + CLEANUP_INTERVAL_MS
        }

        const current = attempts.get(key)
        if (!current && attempts.size >= maxEntries) {
            const earliestReset = Math.min(
                ...[...attempts.values()].map(window => window.resetAt)
            )
            respondRateLimited(
                response,
                Math.max(1, Math.ceil((earliestReset - timestamp) / 1000))
            )
            return
        }

        const window = !current || current.resetAt <= timestamp
            ? { count: 0, resetAt: timestamp + options.windowMs }
            : current

        window.count += 1
        attempts.set(key, window)

        if (window.count > options.maxAttempts) {
            respondRateLimited(
                response,
                Math.max(1, Math.ceil((window.resetAt - timestamp) / 1000))
            )
            return
        }

        next()
    }
}

function respondRateLimited(response: Response, retryAfterSeconds: number) {
    response.setHeader("Retry-After", retryAfterSeconds)
    response.status(429).json({
        status: "fail",
        code: "RATE_LIMITED",
        message: "Too many attempts"
    })
}
