import express from 'express';
import cors from 'cors'
import database from './db';
import dotenv from 'dotenv'
import type { Server } from "node:http"
import type { ErrorRequestHandler } from "express"

import userRoutes from './routes/userRoutes'
import groupRoutes from './routes/groupRoutes'
import expenseRoutes from './routes/expenseRoutes'

import cookieParser from 'cookie-parser'
import { readAuthConfig } from './config'
import { createLifecycleHandlers } from './logging/lifecycle'
import { logger, readLogLevel } from './logging/logger'
import { requestLogging } from './middleware/requestLogging'
import { sendFailure } from './contracts/http'

dotenv.config({ quiet: true })
readAuthConfig()
readLogLevel()

const app = express()
const port = 5001
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    exposedHeaders: ["X-Request-Id"]
}))
app.use(requestLogging)
app.use(express.json())
app.use(cookieParser())

app.use('/api/users', userRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/expenses', expenseRoutes)

const logUnhandledRequestError: ErrorRequestHandler = (
    error,
    request,
    response,
    next
) => {
    logger.error("request_failed", {
        method: request.method,
        route: typeof request.route?.path === "string"
            ? `${request.baseUrl}${request.route.path}`
            : "unmatched"
    }, error)
    if (response.headersSent) {
        next(error)
        return
    }
    sendFailure(
        response,
        500,
        "INTERNAL_ERROR",
        "Server error"
    )
}

app.use(logUnhandledRequestError)

let server: Server | undefined
let shutdownPromise: Promise<void> | undefined

async function shutdown(exitCode: number) {
    if (shutdownPromise) return shutdownPromise
    shutdownPromise = (async () => {
        logger.info("shutdown_started", { exitCode })
        if (server) {
            await new Promise<void>((resolve, reject) => {
                server?.close(error => error ? reject(error) : resolve())
            })
        }
        await database.end()
        process.exitCode = exitCode
        logger.info("shutdown_completed", { exitCode })
    })().catch(error => {
        process.exitCode = 1
        logger.error("shutdown_failed", { requestedExitCode: exitCode }, error)
    })
    return shutdownPromise
}

const lifecycle = createLifecycleHandlers({ logger, shutdown })
database.on("error", error => {
    logger.error("database_pool_error", {
        operation: "idle_pool_client"
    }, error)
})
process.once("SIGINT", () => void lifecycle.sigint())
process.once("SIGTERM", () => void lifecycle.sigterm())
process.once("uncaughtException", error => void lifecycle.uncaughtException(error))
process.once("unhandledRejection", reason => void lifecycle.unhandledRejection(reason))

async function startServer() {
    logger.info("configuration_validated", {
        environment: process.env.NODE_ENV || "development"
    })
    await database.query("SELECT 1")
    logger.info("database_connected")
    server = await new Promise<Server>((resolve, reject) => {
        const candidate = app.listen(port)
        candidate.once("listening", () => resolve(candidate))
        candidate.once("error", reject)
    })
    logger.info("listener_ready", { port })
}

void startServer().catch(async error => {
    logger.error("startup_failed", { operation: "start_server" }, error)
    await shutdown(1)
})

