import { describe, expect, it, vi } from "vitest"

import { createLifecycleHandlers } from "./lifecycle"
import { createLogger } from "./logger"

describe("process lifecycle logging", () => {
    it("logs unexpected failures and requests a failing shutdown", async () => {
        const sink = vi.fn()
        const shutdown = vi.fn(async () => undefined)
        const handlers = createLifecycleHandlers({
            logger: createLogger({ level: "debug", sink }),
            shutdown
        })

        await handlers.unhandledRejection(new Error("promise failed"))

        expect(shutdown).toHaveBeenCalledWith(1)
        expect(JSON.parse(sink.mock.calls[0][0])).toMatchObject({
            level: "error",
            event: "unhandled_rejection",
            error: { message: "promise failed" }
        })
    })

    it("logs termination signals and requests a clean shutdown", async () => {
        const sink = vi.fn()
        const shutdown = vi.fn(async () => undefined)
        const handlers = createLifecycleHandlers({
            logger: createLogger({ level: "debug", sink }),
            shutdown
        })

        await handlers.sigterm()

        expect(shutdown).toHaveBeenCalledWith(0)
        expect(JSON.parse(sink.mock.calls[0][0])).toMatchObject({
            level: "info",
            event: "shutdown_requested",
            signal: "SIGTERM"
        })
    })
})
