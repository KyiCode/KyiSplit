import { describe, expect, it } from "vitest"
import { readAuthConfig, readRuntimeConfig, readServerConfig } from "../src/config"

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
