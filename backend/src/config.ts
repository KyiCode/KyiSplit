import { isIP } from "node:net"

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
    fxProviderTimeoutMs: number
    shutdownTimeoutMs: number
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
    const profile = environment.DB_PROFILE?.trim()
    if (profile && profile !== "local" && profile !== "prod") {
        throw new Error("DB_PROFILE must be local or prod")
    }
    let connectionString = environment.DATABASE_URL?.trim() || undefined
    if (profile === "local") {
        connectionString = environment.LOCAL_DATABASE_URL?.trim()
        let url: URL
        try {
            url = new URL(connectionString || "")
        } catch {
            throw new Error("LOCAL_DATABASE_URL must be a loopback PostgreSQL URL")
        }
        if (
            !["postgres:", "postgresql:"].includes(url.protocol) ||
            !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
            url.pathname.length <= 1 || url.search || url.hash
        ) {
            throw new Error("LOCAL_DATABASE_URL must be a loopback PostgreSQL URL")
        }
    } else if (profile === "prod") {
        connectionString = environment.SUPABASE_DATABASE_URL?.trim() || connectionString
        if (!connectionString) {
            throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be configured for prod")
        }
        validateProductionDatabaseUrl(connectionString)
    }
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

function validateProductionDatabaseUrl(connectionString: string) {
    let url: URL
    try {
        url = new URL(connectionString)
    } catch {
        throw new Error(
            "SUPABASE_DATABASE_URL or DATABASE_URL must be a hosted PostgreSQL URL for prod"
        )
    }
    if (
        !["postgres:", "postgresql:"].includes(url.protocol) ||
        url.pathname.length <= 1
    ) {
        throw new Error(
            "SUPABASE_DATABASE_URL or DATABASE_URL must be a hosted PostgreSQL URL for prod"
        )
    }
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
    const ipv4Parts = hostname.split(".").map(Number)
    const hostnameWithoutIpv6Brackets = hostname.replace(/^\[|\]$/g, "")
    const isLoopbackIpv4 = isIP(hostname) === 4 && ipv4Parts[0] === 127
    const isAmbiguousIpLiteral = (
        isIP(hostnameWithoutIpv6Brackets) === 0 &&
        /^(?:(?:0x[0-9a-f]+|[0-9]+)(?:\.(?:0x[0-9a-f]+|[0-9]+))*)$/i.test(hostname)
    )
    const localTarget = hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname === "[::1]" ||
        isLoopbackIpv4 ||
        url.searchParams.has("host") ||
        url.searchParams.has("hostaddr")
    if (localTarget) {
        throw new Error("Production database URL must not target a local database")
    }
    if (isIP(hostnameWithoutIpv6Brackets) || isAmbiguousIpLiteral) {
        throw new Error(
            "SUPABASE_DATABASE_URL or DATABASE_URL must use a hosted database hostname for prod"
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
        fxProviderTimeoutMs: readFxProviderTimeoutMs(environment),
        shutdownTimeoutMs: readBoundedInteger(
            environment.SHUTDOWN_TIMEOUT_MS,
            10000,
            1000,
            60000,
            "SHUTDOWN_TIMEOUT_MS"
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

export function readFxProviderTimeoutMs(
    environment: Environment = process.env
) {
    return readBoundedInteger(
        environment.FX_PROVIDER_TIMEOUT_MS,
        5000,
        100,
        30000,
        "FX_PROVIDER_TIMEOUT_MS"
    )
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
