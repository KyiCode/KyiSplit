import type { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/db", () => ({
    default: {
        query: vi.fn()
    }
}))

vi.mock("bcryptjs", () => ({
    default: {
        compare: vi.fn(),
        genSaltSync: vi.fn(),
        hash: vi.fn()
    }
}))

vi.mock("../../src/utils/validators", () => ({
    hasAccount: vi.fn()
}))

vi.mock("../../src/utils/queries", () => ({
    getUser: vi.fn()
}))

vi.mock("../../src/config", () => ({
    readAuthConfig: vi.fn(() => ({
        bcryptCost: 10,
        isProduction: false,
        jwtKey: "test-key"
    }))
}))

vi.mock("../../src/utils/tokenGenerator", () => ({
    clearSessionCookie: vi.fn((response: Response) => {
        response.clearCookie("jwt", {
            httpOnly: true,
            sameSite: "strict",
            secure: false
        })
    }),
    default: vi.fn()
}))

import bcrypt from "bcryptjs"
import database from "../../src/db"
import { getUser } from "../../src/utils/queries"
import generateToken from "../../src/utils/tokenGenerator"
import { hasAccount } from "../../src/utils/validators"
import { login, logout, signup, verifySession } from "../../src/controllers/userController"

const accountMock = vi.mocked(hasAccount)
const compareMock = vi.mocked(bcrypt.compare) as unknown as ReturnType<
    typeof vi.fn<(password: string, hash: string) => Promise<boolean>>
>
const getUserMock = vi.mocked(getUser)
const hashMock = vi.mocked(bcrypt.hash) as unknown as ReturnType<
    typeof vi.fn<(password: string, salt: string) => Promise<string>>
>
const queryMock = vi.mocked(database.query)
const tokenMock = vi.mocked(generateToken)

function createResponse() {
    const response = {
        clearCookie: vi.fn(),
        json: vi.fn(),
        status: vi.fn()
    }
    response.status.mockReturnValue(response)
    return response as unknown as Response
}

function createRequest(body: Record<string, unknown>, userId = "user-1") {
    return {
        body,
        user: { userId }
    } as Request
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("user controller", () => {
    it("rejects sign-up when credentials are invalid", async () => {
        const request = createRequest({ email: "" })
        const response = createResponse()

        await signup(request, response)

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "VALIDATION_ERROR",
            message: "Invalid email or password"
        })
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("normalizes credentials and rejects an existing account", async () => {
        accountMock.mockResolvedValue(true)
        const request = createRequest({
            email: "  Person@Example.COM ",
            password: "long-enough"
        })
        const response = createResponse()

        await signup(request, response)

        expect(accountMock).toHaveBeenCalledWith("person@example.com")
        expect(response.status).toHaveBeenCalledWith(409)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "EMAIL_EXISTS",
            message: "Email already has an account"
        })
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("hashes the password and creates a new user", async () => {
        accountMock.mockResolvedValue(false)
        vi.mocked(bcrypt.genSaltSync).mockReturnValue("salt")
        hashMock.mockResolvedValue("hashed-password")
        queryMock.mockResolvedValue({ rows: [] } as never)
        const request = createRequest({
            email: "person@example.com",
            password: "long-enough"
        })
        const response = createResponse()

        await signup(request, response)

        expect(hashMock).toHaveBeenCalledWith("long-enough", "salt")
        expect(queryMock).toHaveBeenCalledWith(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            ["person@example.com", "hashed-password"]
        )
        expect(response.status).toHaveBeenCalledWith(201)
    })

    it("rejects passwords outside the supported length", async () => {
        const response = createResponse()

        await signup(
            createRequest({
                email: "person@example.com",
                password: "short"
            }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(accountMock).not.toHaveBeenCalled()
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("creates a cookie session without returning a token", async () => {
        getUserMock.mockResolvedValue({
            id: "user-1",
            email: "person@example.com",
            password: "hashed-password"
        })
        accountMock.mockResolvedValue(true)
        compareMock.mockResolvedValue(true)
        tokenMock.mockReturnValue("signed-token")
        const request = createRequest({
            email: " PERSON@example.com ",
            password: "long-enough"
        })
        const response = createResponse()

        await login(request, response)

        expect(getUserMock).toHaveBeenCalledTimes(1)
        expect(getUserMock).toHaveBeenCalledWith("person@example.com")
        expect(accountMock).not.toHaveBeenCalled()
        expect(compareMock).toHaveBeenCalledWith("long-enough", "hashed-password")
        expect(tokenMock).toHaveBeenCalledWith("user-1", response)
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                user: {
                    userId: "user-1",
                    email: "person@example.com"
                }
            }
        })
    })

    it.each([
        ["an unknown account", undefined, true],
        [
            "an incorrect password",
            {
                id: "user-1",
                email: "person@example.com",
                password: "hashed-password"
            },
            false
        ]
    ])("uses the same response for %s", async (_case, user, unknownAccount) => {
        getUserMock.mockResolvedValue(user)
        if (!unknownAccount) compareMock.mockResolvedValue(false)
        const response = createResponse()

        await login(
            createRequest({
                email: "person@example.com",
                password: "long-enough"
            }),
            response
        )

        expect(getUserMock).toHaveBeenCalledTimes(1)
        expect(response.status).toHaveBeenCalledWith(401)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "UNAUTHENTICATED",
            message: "Invalid credentials"
        })
        expect(tokenMock).not.toHaveBeenCalled()
    })

    it("rejects invalid login input before account lookup", async () => {
        const response = createResponse()

        await login(
            createRequest({ email: "not-an-email", password: "long-enough" }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(getUserMock).not.toHaveBeenCalled()
    })

    it("verifies an authenticated session with user identity", async () => {
        const response = createResponse()

        await verifySession(createRequest({}), response)

        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                userId: "user-1"
            }
        })
    })

    it("clears the session cookie on logout", async () => {
        const response = createResponse()

        await logout(createRequest({}), response)

        expect(response.clearCookie).toHaveBeenCalledWith(
            "jwt",
            expect.objectContaining({
                httpOnly: true,
                sameSite: "strict"
            })
        )
        expect(response.status).toHaveBeenCalledWith(200)
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {}
        })
    })

    it("uses a generic response even when password comparison fails", async () => {
        getUserMock.mockResolvedValue({
            id: "user-1",
            email: "person@example.com",
            password: "hashed-password"
        })
        accountMock.mockResolvedValue(true)
        compareMock.mockResolvedValue(false)
        const response = createResponse()

        await login(
            createRequest({
                email: "person@example.com",
                password: "wrong-but-long"
            }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(401)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "UNAUTHENTICATED",
            message: "Invalid credentials"
        })
        expect(tokenMock).not.toHaveBeenCalled()
    })
})
