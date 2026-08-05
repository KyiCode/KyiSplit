import path from 'node:path'
import dotenv from 'dotenv'
import database from './db'
import { readRuntimeConfig } from './config'
import { createApp } from './app'
import { createDatabaseReadinessCheck } from './runtime/health'
import { createServerRuntime } from './runtime/serverRuntime'
import { createLifecycleHandlers } from './logging/lifecycle'
import { logger, readLogLevel } from './logging/logger'

dotenv.config({ quiet: true })

const config = readRuntimeConfig()
readLogLevel()

const configuredFrontendRoot = process.env.FRONTEND_ROOT?.trim()
const frontendRoot = configuredFrontendRoot
    ? path.resolve(configuredFrontendRoot)
    : process.env.NODE_ENV === 'production'
        ? path.resolve(path.join(__dirname, '..', 'public'))
        : undefined

const runtime = createServerRuntime({
    app: createApp({
        corsOrigin: frontendRoot ? undefined : config.appOrigin,
        frontendRoot,
        trustProxyHops: config.trustProxyHops,
        requestBodyLimitBytes: config.requestBodyLimitBytes,
        abuseControl: config.authRateLimit,
        readiness: createDatabaseReadinessCheck({
            database,
            timeoutMs: config.database.connectionTimeoutMs,
            logger
        })
    }),
    database,
    logger,
    port: config.port,
    readinessTimeoutMs: config.database.connectionTimeoutMs
})

const shutdown = (exitCode: number) => runtime.shutdown(exitCode)
const lifecycle = createLifecycleHandlers({ logger, shutdown })
process.once("SIGINT", () => void lifecycle.sigint())
process.once("SIGTERM", () => void lifecycle.sigterm())
process.once("uncaughtException", error => void lifecycle.uncaughtException(error))
process.once("unhandledRejection", reason => void lifecycle.unhandledRejection(reason))

void runtime.start().catch(async () => {
    await shutdown(1)
})
