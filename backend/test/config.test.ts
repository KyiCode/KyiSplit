import { describe, expect, it } from "vitest"
import { readAuthConfig, readDatabaseConfig, readRuntimeConfig, readServerConfig } from "../src/config"

describe("auth configuration", () => {
    it("parses valid authentication configuration", () => {
        expect(readAuthConfig({
            BCRYPT_SALT: "12",
            JWT_KEY: "test-key",
            NODE_ENV: "production"
        })).toEqual({
            bcryptCost: 12,
            isProduction: true,
            jwtKey: "test-key"
        })
    })

    it.each([
        [{ BCRYPT_SALT: "10" }, "JWT_KEY"],
        [{ JWT_KEY: "test-key" }, "BCRYPT_SALT"],
        [{ BCRYPT_SALT: "not-a-number", JWT_KEY: "test-key" }, "BCRYPT_SALT"],
        [{ BCRYPT_SALT: "2", JWT_KEY: "test-key" }, "BCRYPT_SALT"],
        [{ BCRYPT_SALT: "32", JWT_KEY: "test-key" }, "BCRYPT_SALT"]
    ])("rejects invalid configuration %#", (environment, expected) => {
        expect(() => readAuthConfig(environment)).toThrow(expected)
    })
})

describe("server configuration", () => {
    it("parses explicit listener and browser origins", () => {
        expect(readServerConfig({
            FRONTEND_URL: "http://127.0.0.1:5510",
            PORT: "5511"
        })).toEqual({
            appOrigin: "http://127.0.0.1:5510",
            port: 5511
        })
    })

    it("supports the existing APP_ORIGIN alias", () => {
        expect(readServerConfig({
            APP_ORIGIN: "http://localhost:5173",
            PORT: "5001"
        }).appOrigin).toBe("http://localhost:5173")
    })

    it.each([
        [{ FRONTEND_URL: "http://127.0.0.1:5510" }, "PORT"],
        [{ FRONTEND_URL: "http://127.0.0.1:5510", PORT: "0" }, "PORT"],
        [{ FRONTEND_URL: "not-a-url", PORT: "5511" }, "FRONTEND_URL"]
    ])("rejects invalid server configuration %#", (environment, expected) => {
        expect(() => readServerConfig(environment)).toThrow(expected)
    })
})

describe("production runtime configuration", () => {
    const validEnvironment = {
        NODE_ENV: "production",
        JWT_KEY: "a-production-secret",
        BCRYPT_SALT: "12",
        FRONTEND_URL: "https://kyisplit.example",
        PORT: "10000",
        DATABASE_URL: "postgresql://user:password@example.test/kyisplit",
        TRUST_PROXY_HOPS: "1",
        REQUEST_BODY_LIMIT_BYTES: "65536",
        DB_POOL_MAX: "10",
        DB_IDLE_TIMEOUT_MS: "10000",
        DB_CONNECTION_TIMEOUT_MS: "5000"
    }

    it("validates and returns production runtime settings", () => {
        expect(readRuntimeConfig(validEnvironment, "v22.12.0")).toMatchObject({
            appOrigin: "https://kyisplit.example",
            port: 10000,
            trustProxyHops: 1,
            requestBodyLimitBytes: 65536,
            fxProviderTimeoutMs: 5000,
            shutdownTimeoutMs: 10000,
            database: {
                connectionString: validEnvironment.DATABASE_URL,
                max: 10,
                idleTimeoutMs: 10000,
                connectionTimeoutMs: 5000
            }
        })
    })

    it.each([
        [{ ...validEnvironment, FRONTEND_URL: "http://kyisplit.example" }, "HTTPS"],
        [{ ...validEnvironment, TRUST_PROXY_HOPS: undefined }, "TRUST_PROXY_HOPS"],
        [{ ...validEnvironment, DATABASE_URL: undefined }, "DATABASE_URL"],
        [{ ...validEnvironment, REQUEST_BODY_LIMIT_BYTES: "512" }, "REQUEST_BODY_LIMIT_BYTES"],
        [{ ...validEnvironment, FX_PROVIDER_TIMEOUT_MS: "0" }, "FX_PROVIDER_TIMEOUT_MS"],
        [{ ...validEnvironment, SHUTDOWN_TIMEOUT_MS: "60001" }, "SHUTDOWN_TIMEOUT_MS"],
        [{ ...validEnvironment, DB_POOL_MAX: "0" }, "DB_POOL_MAX"],
        [{ ...validEnvironment, DB_CONNECTION_TIMEOUT_MS: "0" }, "DB_CONNECTION_TIMEOUT_MS"]
    ])("rejects unsafe production configuration %#", (environment, expected) => {
        expect(() => readRuntimeConfig(environment, "v22.12.0")).toThrow(expected)
    })

    it("rejects a runtime outside the selected Node major version", () => {
        expect(() => readRuntimeConfig(validEnvironment, "v24.3.0")).toThrow(
            "Node.js 22"
        )
    })
})

describe("database and runtime profile independence", () => {
    it("uses the prod database with development runtime settings", () => {
        const config = readRuntimeConfig({
            NODE_ENV: "development",
            DB_PROFILE: "prod",
            JWT_KEY: "test-signing-key",
            BCRYPT_SALT: "10",
            FRONTEND_URL: "http://localhost:5173",
            PORT: "5001",
            SUPABASE_DATABASE_URL: "postgresql://supabase.example/app"
        }, "v24.3.0")

        expect(config.isProduction).toBe(false)
        expect(config.database.connectionString)
            .toBe("postgresql://supabase.example/app")
    })

    it("retains production runtime checks with the prod database", () => {
        expect(() => readRuntimeConfig({
            NODE_ENV: "production",
            DB_PROFILE: "prod",
            JWT_KEY: "test-signing-key",
            BCRYPT_SALT: "10",
            FRONTEND_URL: "https://kyisplit.example",
            PORT: "5001",
            SUPABASE_DATABASE_URL: "postgresql://supabase.example/app",
            TRUST_PROXY_HOPS: "1"
        }, "v24.3.0")).toThrow("Node.js 22")
    })
})

describe("database profiles", () => {
    const localUrl = "postgresql://review@127.0.0.1:55433/kyisplit_local"
    const hostedUrl = "postgresql://supabase.example/app"

    it("uses only the explicit local URL for local development", () => {
        expect(readDatabaseConfig({
            DB_PROFILE: "local",
            LOCAL_DATABASE_URL: localUrl,
            DATABASE_URL: hostedUrl
        }).connectionString).toBe(localUrl)
    })

    it.each([
        undefined,
        "postgresql://remote.example/app",
        "mysql://localhost/app",
        "postgresql://localhost",
        "postgresql://localhost/app?host=remote.example"
    ])("rejects an unsafe local target: %s", url => {
        expect(() => readDatabaseConfig({
            DB_PROFILE: "local",
            LOCAL_DATABASE_URL: url,
            DATABASE_URL: hostedUrl
        })).toThrow("LOCAL_DATABASE_URL")
    })

    it("uses the Supabase URL in the prod profile", () => {
        expect(readDatabaseConfig({
            DB_PROFILE: "prod",
            SUPABASE_DATABASE_URL: hostedUrl,
            LOCAL_DATABASE_URL: localUrl
        }).connectionString).toBe(hostedUrl)
    })

    it("preserves DATABASE_URL as the prod deployment alias", () => {
        expect(readDatabaseConfig({
            DB_PROFILE: "prod",
            DATABASE_URL: hostedUrl
        }).connectionString).toBe(hostedUrl)
    })

    it("never falls back to local for prod", () => {
        expect(() => readDatabaseConfig({
            DB_PROFILE: "prod",
            LOCAL_DATABASE_URL: localUrl
        })).toThrow("SUPABASE_DATABASE_URL")
    })

    it("rejects a local DATABASE_URL alias in the prod profile", () => {
        expect(() => readDatabaseConfig({
            DB_PROFILE: "prod",
            DATABASE_URL: localUrl
        })).toThrow("must not target a local database")
    })

    it.each([
        "postgresql://local@localhost/app",
        "postgresql://local@127.1/app",
        "postgresql://local@0x7f000001/app",
        "postgresql://local@[::1]/app",
        "postgresql://local@[fe80::1]/app",
        "postgresql://db.example/app?host=127.0.0.1",
        "mysql://db.example/app",
        "not-a-database-url"
    ])("rejects a non-hosted prod database URL: %s", url => {
        expect(() => readDatabaseConfig({
            DB_PROFILE: "prod",
            SUPABASE_DATABASE_URL: url
        })).toThrow()
    })

    it("rejects an unknown profile", () => {
        expect(() => readDatabaseConfig({ DB_PROFILE: "typo" })).toThrow("DB_PROFILE")
    })

    it("keeps existing explicit database configuration compatible", () => {
        expect(readDatabaseConfig({ DATABASE_URL: localUrl }).connectionString)
            .toBe(localUrl)
    })
})
