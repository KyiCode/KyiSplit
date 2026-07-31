import { describe, expect, it, vi } from "vitest"

import { createLogger, readLogLevel } from "./logger"

describe("structured logger", () => {
    it("emits machine-readable records and filters lower levels", () => {
        const sink = vi.fn()
        const logger = createLogger({
            level: "info",
            sink,
            now: () => new Date("2026-08-01T00:00:00.000Z")
        })

        logger.debug("hidden_event")
        logger.info("visible_event", { requestId: "request-1", status: 201 })

        expect(sink).toHaveBeenCalledTimes(1)
        expect(JSON.parse(sink.mock.calls[0][0])).toEqual({
            timestamp: "2026-08-01T00:00:00.000Z",
            level: "info",
            event: "visible_event",
            requestId: "request-1",
            status: 201
        })
    })

    it("records safe error metadata and redacts sensitive values", () => {
        const sink = vi.fn()
        const logger = createLogger({ level: "debug", sink })
        const error = Object.assign(new Error(
            "insert failed password=database-secret " +
            "postgresql://user:secret@example.test/db"
        ), {
            code: "23505",
            constraint: "users_email_key",
            table: "users"
        })

        logger.error("signup_failed", {
            password: "plain-text",
            cookie: "jwt=secret",
            authorization: "Bearer secret",
            databaseUrl: "postgresql://user:secret@example.test/db",
            nested: { token: "invite-secret" }
        }, error)

        const record = JSON.parse(sink.mock.calls[0][0])
        expect(record).toMatchObject({
            level: "error",
            event: "signup_failed",
            password: "[REDACTED]",
            cookie: "[REDACTED]",
            authorization: "[REDACTED]",
            databaseUrl: "[REDACTED]",
            nested: { token: "[REDACTED]" },
            error: {
                name: "Error",
                message: "insert failed password=[REDACTED] " +
                    "[REDACTED_DATABASE_URL]",
                code: "23505",
                constraint: "users_email_key",
                table: "users"
            }
        })
        expect(JSON.stringify(record)).not.toContain("plain-text")
        expect(JSON.stringify(record)).not.toContain("database-secret")
        expect(JSON.stringify(record)).not.toContain("invite-secret")
        expect(JSON.stringify(record)).not.toContain("postgresql://")
    })

    it("validates configured log levels", () => {
        expect(readLogLevel({ LOG_LEVEL: "warn" })).toBe("warn")
        expect(() => readLogLevel({ LOG_LEVEL: "verbose" })).toThrow(
            "LOG_LEVEL must be one of"
        )
    })
})
