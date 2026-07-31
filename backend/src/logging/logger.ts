import { AsyncLocalStorage } from "node:async_hooks"

export const LOG_LEVELS = ["debug", "info", "warn", "error", "silent"] as const
export type LogLevel = typeof LOG_LEVELS[number]
export type LogContext = Record<string, unknown>
export type LogSink = (line: string) => void

type Environment = Record<string, string | undefined>

interface LoggerOptions {
    level: LogLevel
    sink?: LogSink
    now?: () => Date
}

interface RequestLogContext {
    requestId: string
}

const requestContext = new AsyncLocalStorage<RequestLogContext>()
const levelPriority: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    silent: Number.POSITIVE_INFINITY
}
const sensitiveKey = /(?:authorization|body|cookie|database.?url|hash|password|secret|token)/i
const postgresUrl = /postgres(?:ql)?:\/\/[^\s"']+/gi
const bearerToken = /Bearer\s+[^\s"']+/gi
const credentialAssignment = /\b(password|secret|token|cookie|authorization|database_?url)\s*([=:])\s*[^\s,;]+/gi
const jwtValue = /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g
const longHexToken = /\b[0-9a-f]{64,}\b/gi

export function readLogLevel(environment: Environment = process.env): LogLevel {
    const configured = environment.LOG_LEVEL?.trim().toLowerCase()
    if (!configured) {
        return environment.NODE_ENV === "test" ? "silent" : "info"
    }
    if (!(LOG_LEVELS as readonly string[]).includes(configured)) {
        throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVELS.join(", ")}`)
    }
    return configured as LogLevel
}

function redactText(value: string) {
    return value
        .replace(postgresUrl, "[REDACTED_DATABASE_URL]")
        .replace(bearerToken, "Bearer [REDACTED]")
        .replace(credentialAssignment, "$1$2[REDACTED]")
        .replace(jwtValue, "[REDACTED_JWT]")
        .replace(longHexToken, "[REDACTED_TOKEN]")
}

function sanitize(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
    if (sensitiveKey.test(key)) return "[REDACTED]"
    if (typeof value === "string") return redactText(value)
    if (
        value === null ||
        value === undefined ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) return value
    if (typeof value === "bigint") return value.toString()
    if (typeof value !== "object") return String(value)
    if (seen.has(value)) return "[CIRCULAR]"
    seen.add(value)
    if (Array.isArray(value)) {
        return value.map(entry => sanitize(entry, "", seen))
    }
    return Object.fromEntries(
        Object.entries(value).map(([entryKey, entryValue]) => [
            entryKey,
            sanitize(entryValue, entryKey, seen)
        ])
    )
}

function serializeError(error: unknown) {
    if (!(error instanceof Error)) {
        return { name: "UnknownError", message: redactText(String(error)) }
    }
    const databaseError = error as Error & {
        code?: unknown
        constraint?: unknown
        table?: unknown
        schema?: unknown
        routine?: unknown
    }
    const result: Record<string, unknown> = {
        name: error.name,
        message: redactText(error.message)
    }
    if (error.stack) result.stack = redactText(error.stack)
    for (const key of ["code", "constraint", "table", "schema", "routine"] as const) {
        if (typeof databaseError[key] === "string") {
            result[key] = redactText(databaseError[key] as string)
        }
    }
    return result
}

export interface Logger {
    debug(event: string, context?: LogContext): void
    info(event: string, context?: LogContext): void
    warn(event: string, context?: LogContext, error?: unknown): void
    error(event: string, context?: LogContext, error?: unknown): void
}

export function createLogger(options: LoggerOptions): Logger {
    const sink = options.sink ?? (line => process.stdout.write(`${line}\n`))
    const now = options.now ?? (() => new Date())

    function write(
        level: Exclude<LogLevel, "silent">,
        event: string,
        context: LogContext = {},
        error?: unknown
    ) {
        if (levelPriority[level] < levelPriority[options.level]) return
        const activeRequest = requestContext.getStore()
        const record: Record<string, unknown> = {
            timestamp: now().toISOString(),
            level,
            event,
            ...(activeRequest ?? {}),
            ...(sanitize(context) as LogContext)
        }
        if (error !== undefined) record.error = serializeError(error)
        sink(JSON.stringify(record))
    }

    return {
        debug: (event, context) => write("debug", event, context),
        info: (event, context) => write("info", event, context),
        warn: (event, context, error) => write("warn", event, context, error),
        error: (event, context, error) => write("error", event, context, error)
    }
}

export function runWithRequestContext<T>(requestId: string, operation: () => T): T {
    return requestContext.run({ requestId }, operation)
}

export const logger = createLogger({ level: readLogLevel() })
