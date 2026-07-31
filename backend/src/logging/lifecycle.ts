import type { Logger } from "./logger"

interface LifecycleOptions {
    logger: Logger
    shutdown: (exitCode: number) => Promise<void>
}

export function createLifecycleHandlers({ logger, shutdown }: LifecycleOptions) {
    return {
        uncaughtException: async (error: unknown) => {
            logger.error("uncaught_exception", {}, error)
            await shutdown(1)
        },
        unhandledRejection: async (reason: unknown) => {
            logger.error("unhandled_rejection", {}, reason)
            await shutdown(1)
        },
        sigint: async () => {
            logger.info("shutdown_requested", { signal: "SIGINT" })
            await shutdown(0)
        },
        sigterm: async () => {
            logger.info("shutdown_requested", { signal: "SIGTERM" })
            await shutdown(0)
        }
    }
}
