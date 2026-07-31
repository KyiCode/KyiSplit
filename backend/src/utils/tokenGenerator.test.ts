import type { Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../config", () => ({
    readAuthConfig: vi.fn()
}))

vi.mock("jsonwebtoken", () => ({
    default: {
        sign: vi.fn(() => "signed-token")
    }
}))

import jwt from "jsonwebtoken"
import { readAuthConfig } from "../config"
import generateToken, {
    clearSessionCookie,
    SESSION_DURATION_MS
} from "./tokenGenerator"

const configMock = vi.mocked(readAuthConfig)

function createResponse() {
    return {
        clearCookie: vi.fn(),
        cookie: vi.fn()
    } as unknown as Response
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("token generator", () => {
    it.each([false, true])(
        "sets the expected cookie attributes when production is %s",
        isProduction => {
            configMock.mockReturnValue({
                bcryptCost: 10,
                isProduction,
                jwtKey: "test-key"
            })
            const response = createResponse()

            const token = generateToken("user-1", response)

            expect(token).toBe("signed-token")
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: "user-1" },
                "test-key",
                { expiresIn: "10d" }
            )
            expect(response.cookie).toHaveBeenCalledWith(
                "jwt",
                "signed-token",
                {
                    httpOnly: true,
                    maxAge: SESSION_DURATION_MS,
                    sameSite: "strict",
                    secure: isProduction
                }
            )
        }
    )

    it("clears the cookie with matching attributes", () => {
        configMock.mockReturnValue({
            bcryptCost: 10,
            isProduction: true,
            jwtKey: "test-key"
        })
        const response = createResponse()

        clearSessionCookie(response)

        expect(response.clearCookie).toHaveBeenCalledWith("jwt", {
            httpOnly: true,
            sameSite: "strict",
            secure: true
        })
    })
})
