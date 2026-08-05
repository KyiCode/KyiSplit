import fs from 'node:fs'
import path from 'node:path'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { sendFailure } from './contracts/http'
import { logger } from './logging/logger'
import { requestLogging } from './middleware/requestLogging'
import { type RateLimitOptions } from './middleware/rateLimit'
import expenseRoutes from './routes/expenseRoutes'
import groupRoutes from './routes/groupRoutes'
import { createUserRoutes } from './routes/userRoutes'

interface AppOptions {
    corsOrigin?: string
    frontendRoot?: string
    trustProxyHops?: number
    requestBodyLimitBytes?: number
    abuseControl?: RateLimitOptions
    readiness?: () => Promise<boolean> | boolean
}

export function createApp(options: AppOptions = {}) {
    const frontendRoot = options.frontendRoot
        ? validateFrontendRoot(options.frontendRoot)
        : undefined
    const app = express()
    app.set('trust proxy', options.trustProxyHops ?? false)

    const readiness = options.readiness ?? (() => true)

    app.get('/health/live', (_request, response) => {
        response.status(200).json({ status: 'ok' })
    })
    app.get('/health/ready', async (_request, response) => {
        try {
            if (!(await readiness())) {
                throw new Error('readiness check failed')
            }
            response.status(200).json({ status: 'ok' })
        } catch (error) {
            logger.warn('readiness_failed', { operation: 'health_ready' }, error)
            response.status(503).json({ status: 'fail', message: 'Not ready' })
        }
    })

    if (options.corsOrigin) {
        app.use(cors({
            origin: options.corsOrigin,
            credentials: true,
            exposedHeaders: ['X-Request-Id']
        }))
    }
    app.use(requestLogging)
    app.use(express.json({
        limit: options.requestBodyLimitBytes ?? 1048576
    }))
    app.use(cookieParser())

    app.use('/api/users', createUserRoutes(options.abuseControl))
    app.use('/api/groups', groupRoutes)
    app.use('/api/expenses', expenseRoutes)
    app.use('/api', (_request, response) => {
        sendFailure(response, 404, 'NOT_FOUND', 'API route not found')
    })

    if (frontendRoot) {
        app.use(express.static(frontendRoot, { index: false }))
        app.use((request, response) => {
            if (
                request.method === 'GET' &&
                path.extname(request.path) === '' &&
                request.accepts('html')
            ) {
                response.sendFile(path.join(frontendRoot, 'index.html'))
                return
            }
            response.sendStatus(404)
        })
    }

    app.use(logUnhandledRequestError)
    return app
}

function validateFrontendRoot(frontendRoot: string) {
    const resolved = path.resolve(frontendRoot)
    if (
        !fs.statSync(resolved, { throwIfNoEntry: false })?.isDirectory() ||
        !fs.statSync(path.join(resolved, 'index.html'), {
            throwIfNoEntry: false
        })?.isFile() ||
        !fs.statSync(path.join(resolved, 'assets'), {
            throwIfNoEntry: false
        })?.isDirectory()
    ) {
        throw new Error('Production frontend build is incomplete')
    }
    return resolved
}

const logUnhandledRequestError: ErrorRequestHandler = (
    error,
    request,
    response,
    next
) => {
    if (isBodyTooLargeError(error)) {
        logger.warn('request_body_rejected', {
            method: request.method,
            operation: 'request_size_limit'
        })
        if (!response.headersSent) {
            sendFailure(response, 413, 'VALIDATION_ERROR', 'Request body too large')
        }
        return
    }
    logger.error('request_failed', {
        method: request.method,
        route: typeof request.route?.path === 'string'
            ? `${request.baseUrl}${request.route.path}`
            : 'unmatched'
    }, error)
    if (response.headersSent) {
        next(error)
        return
    }
    sendFailure(response, 500, 'INTERNAL_ERROR', 'Server error')
}

function isBodyTooLargeError(error: unknown): error is { type: string } {
    return Boolean(
        error &&
        typeof error === 'object' &&
        'type' in error &&
        error.type === 'entity.too.large'
    )
}
