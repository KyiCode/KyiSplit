import { describe, expect, it } from "vitest"
import { readAuthConfig } from "./config"

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
