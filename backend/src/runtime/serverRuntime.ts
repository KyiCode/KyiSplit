import type { Logger } from "../logging/logger"
import { withTimeout } from "./health"

interface ListeningServer {
    once?: (event: string, listener: (...args: unknown[]) => void) => unknown
    close: (callback: (error?: Error) => void) => unknown
}

interface AppLike {
    listen: (port: number) => ListeningServer
}

interface DatabaseLike {
    query: (text: string) => Promise<unknown>
    end: () => Promise<void>
    on?: (
        event: "error",
        listener: (error: Error, ...details: unknown[]) => void
    ) => unknown
}

interface ServerRuntimeOptions {
    app: AppLike
    database: DatabaseLike
    logger: Logger
    port: number
    readinessTimeoutMs: number
}

export function createServerRuntime({
    app,
    database,
    logger,
    port,
    readinessTimeoutMs
}: ServerRuntimeOptions) {
    let server: ListeningServer | undefined
    let shutdownPromise: Promise<void> | undefined

    database.on?.("error", error => {
        logger.error("database_pool_error", {
            operation: "pool_client"
        }, error)
    })

    async function start() {
        try {
            logger.info("configuration_validated")
            await withTimeout(database.query("SELECT 1"), readinessTimeoutMs)
            logger.info("database_connected")
            server = await listen(app, port)
            logger.info("listener_ready", { port })
        } catch (error) {
            logger.error("startup_failed", { operation: "start_server" }, error)
            throw error
        }
    }

    async function shutdown(exitCode: number) {
        if (shutdownPromise) return shutdownPromise
        shutdownPromise = (async () => {
            logger.info("shutdown_started", { exitCode })
            if (server) await close(server)
            await database.end()
            process.exitCode = exitCode
            logger.info("shutdown_completed", { exitCode })
        })().catch(error => {
            logger.error("shutdown_failed", { requestedExitCode: exitCode }, error)
            throw error
        })
        return shutdownPromise
    }

    return { start, shutdown }
}

function listen(app: AppLike, port: number) {
    return new Promise<ListeningServer>((resolve, reject) => {
        const candidate = app.listen(port)
        if (typeof candidate.once !== "function") {
            resolve(candidate)
            return
        }
        candidate.once("listening", () => resolve(candidate))
        candidate.once("error", reject)
    })
}

function close(server: ListeningServer) {
    return new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
    })
}
