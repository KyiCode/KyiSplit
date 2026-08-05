export interface AuthConfig {
    bcryptCost: number
    isProduction: boolean
    jwtKey: string
}

export interface ServerConfig {
    appOrigin: string
    port: number
}

export interface DatabaseConfig {
    connectionString?: string
    max: number
    idleTimeoutMs: number
    connectionTimeoutMs: number
}

export interface RuntimeConfig extends AuthConfig, ServerConfig {
    trustProxyHops: number
    requestBodyLimitBytes: number
    authRateLimit: {
        maxAttempts: number
        windowMs: number
    }
    database: DatabaseConfig
}

type Environment = Record<string, string | undefined>

export function readAuthConfig(environment: Environment = process.env): AuthConfig {
    const jwtKey = environment.JWT_KEY?.trim()
    if (!jwtKey) {
        throw new Error("JWT_KEY must be configured")
    }

    const rawBcryptCost = environment.BCRYPT_SALT
    const bcryptCost = Number(rawBcryptCost)
    if (
        !rawBcryptCost ||
        !Number.isInteger(bcryptCost) ||
        bcryptCost < 4 ||
        bcryptCost > 31
    ) {
        throw new Error("BCRYPT_SALT must be an integer from 4 through 31")
    }

    return {
        bcryptCost,
        isProduction: environment.NODE_ENV === "production",
        jwtKey
    }
}

export function readServerConfig(
    environment: Environment = process.env
): ServerConfig {
    const rawPort = environment.PORT
    const port = Number(rawPort)
    if (
        !rawPort ||
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535
    ) {
        throw new Error("PORT must be an integer from 1 through 65535")
    }

    return {
        appOrigin: readAppOrigin(environment),
        port
    }
}

export function readDatabaseConfig(
    environment: Environment = process.env
): DatabaseConfig {
    const connectionString = environment.DATABASE_URL?.trim() || undefined
    if (environment.NODE_ENV === "production" && !connectionString) {
        throw new Error("DATABASE_URL must be configured")
    }

    return {
        connectionString,
        max: readBoundedInteger(environment.DB_POOL_MAX, 10, 1, 50, "DB_POOL_MAX"),
        idleTimeoutMs: readBoundedInteger(
            environment.DB_IDLE_TIMEOUT_MS,
            10000,
            1000,
            120000,
            "DB_IDLE_TIMEOUT_MS"
        ),
        connectionTimeoutMs: readBoundedInteger(
            environment.DB_CONNECTION_TIMEOUT_MS,
            5000,
            100,
            30000,
            "DB_CONNECTION_TIMEOUT_MS"
        )
    }
}

export function readRuntimeConfig(
    environment: Environment = process.env,
    nodeVersion = process.version
): RuntimeConfig {
    const auth = readAuthConfig(environment)
    const server = readServerConfig(environment)
    const isProduction = environment.NODE_ENV === "production"

    if (isProduction && !server.appOrigin.startsWith("https://")) {
        throw new Error("FRONTEND_URL must use HTTPS in production")
    }

    const nodeMajor = Number(/^v?(\d+)/.exec(nodeVersion)?.[1])
    if (isProduction && nodeMajor !== 22) {
        throw new Error("Production requires Node.js 22")
    }

    const trustProxyHops = isProduction
        ? readBoundedInteger(
            environment.TRUST_PROXY_HOPS,
            undefined,
            1,
            10,
            "TRUST_PROXY_HOPS"
        )
        : readBoundedInteger(
            environment.TRUST_PROXY_HOPS,
            0,
            0,
            10,
            "TRUST_PROXY_HOPS"
        )

    if (isProduction && auth.bcryptCost < 10) {
        throw new Error("BCRYPT_SALT must be at least 10 in production")
    }

    return {
        ...auth,
        ...server,
        trustProxyHops,
        requestBodyLimitBytes: readBoundedInteger(
            environment.REQUEST_BODY_LIMIT_BYTES,
            1048576,
            1024,
            1048576,
            "REQUEST_BODY_LIMIT_BYTES"
        ),
        authRateLimit: {
            maxAttempts: readBoundedInteger(
                environment.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
                10,
                1,
                100,
                "AUTH_RATE_LIMIT_MAX_ATTEMPTS"
            ),
            windowMs: readBoundedInteger(
                environment.AUTH_RATE_LIMIT_WINDOW_MS,
                60000,
                1000,
                3600000,
                "AUTH_RATE_LIMIT_WINDOW_MS"
            )
        },
        database: readDatabaseConfig(environment)
    }
}

export function readAppOrigin(environment: Environment = process.env) {
    const rawOrigin = (
        environment.FRONTEND_URL || environment.APP_ORIGIN
    )?.trim()
    let appOrigin: URL
    try {
        appOrigin = new URL(rawOrigin || "")
    } catch {
        throw new Error("FRONTEND_URL must be an absolute HTTP(S) URL")
    }
    if (
        (appOrigin.protocol !== "http:" && appOrigin.protocol !== "https:") ||
        appOrigin.pathname !== "/" ||
        appOrigin.search ||
        appOrigin.hash
    ) {
        throw new Error("FRONTEND_URL must be an HTTP(S) origin")
    }

    return appOrigin.origin
}

function readBoundedInteger(
    rawValue: string | undefined,
    defaultValue: number | undefined,
    minimum: number,
    maximum: number,
    name: string
) {
    const value = rawValue === undefined || rawValue.trim() === ""
        ? defaultValue
        : Number(rawValue)
    if (
        value === undefined ||
        !Number.isInteger(value) ||
        value < minimum ||
        value > maximum
    ) {
        throw new Error(`${name} must be an integer from ${minimum} through ${maximum}`)
    }
    return value
}
