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
    process.env.SIGNUP_TOKEN = "signup-secret"
})

describe("user controller", () => {
    it("rejects sign-up when credentials are invalid", async () => {
        const request = createRequest({ username: "" })
        const response = createResponse()

        await signup(request, response)

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "VALIDATION_ERROR",
            message: "Enter a valid username, password, and signup token"
        })
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("normalizes credentials and rejects an existing account", async () => {
        accountMock.mockResolvedValue(true)
        const request = createRequest({
            username: "  Person_Name ",
            password: "long-enough",
            token: "signup-secret"
        })
        const response = createResponse()

        await signup(request, response)

        expect(accountMock).toHaveBeenCalledWith("person_name")
        expect(response.status).toHaveBeenCalledWith(409)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "USERNAME_EXISTS",
            message: "Username is already taken"
        })
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("hashes the password and creates a new user", async () => {
        accountMock.mockResolvedValue(false)
        vi.mocked(bcrypt.genSaltSync).mockReturnValue("salt")
        hashMock.mockResolvedValue("hashed-password")
        queryMock.mockResolvedValue({ rows: [] } as never)
        const request = createRequest({
            username: "person_name",
            password: "long-enough",
            token: "signup-secret"
        })
        const response = createResponse()

        await signup(request, response)

        expect(hashMock).toHaveBeenCalledWith("long-enough", "salt")
        expect(queryMock).toHaveBeenCalledWith(
            "INSERT INTO users (username, password) VALUES ($1, $2)",
            ["person_name", "hashed-password"]
        )
        expect(response.status).toHaveBeenCalledWith(201)
    })

    it("rejects passwords outside the supported length", async () => {
        const response = createResponse()

        await signup(
            createRequest({
                username: "person_name",
                password: "abc",
                token: "signup-secret"
            }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(accountMock).not.toHaveBeenCalled()
        expect(queryMock).not.toHaveBeenCalled()
    })

    it.each([
        ["four characters", "abcd"],
        ["72 ASCII bytes", "a".repeat(72)],
        ["18 four-byte characters", "😀".repeat(18)]
    ])("accepts a signup password at the bcrypt byte limit: %s", async (_name, password) => {
        accountMock.mockResolvedValue(false)
        vi.mocked(bcrypt.genSaltSync).mockReturnValue("salt")
        hashMock.mockResolvedValue("hashed-password")
        queryMock.mockResolvedValue({ rows: [] } as never)
        const response = createResponse()

        await signup(
            createRequest({ username: "person_name", password, token: "signup-secret" }),
            response
        )

        expect(hashMock).toHaveBeenCalledWith(password, "salt")
        expect(response.status).toHaveBeenCalledWith(201)
    })

    it.each([
        ["73 ASCII bytes", "a".repeat(73)],
        ["19 four-byte characters", "😀".repeat(19)]
    ])("rejects a signup password over the bcrypt byte limit: %s", async (_name, password) => {
        const response = createResponse()

        await signup(
            createRequest({ username: "person_name", password, token: "signup-secret" }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "VALIDATION_ERROR",
            message: "Password must be 72 UTF-8 bytes or fewer"
        })
        expect(accountMock).not.toHaveBeenCalled()
        expect(hashMock).not.toHaveBeenCalled()
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("creates a cookie session without returning a token", async () => {
        getUserMock.mockResolvedValue({
            id: "user-1",
            username: "person_name",
            password: "hashed-password"
        })
        accountMock.mockResolvedValue(true)
        compareMock.mockResolvedValue(true)
        tokenMock.mockReturnValue("signed-token")
        const request = createRequest({
            username: " Person_Name ",
            password: "long-enough"
        })
        const response = createResponse()

        await login(request, response)

        expect(getUserMock).toHaveBeenCalledTimes(1)
        expect(getUserMock).toHaveBeenCalledWith("person_name")
        expect(accountMock).not.toHaveBeenCalled()
        expect(compareMock).toHaveBeenCalledWith("long-enough", "hashed-password")
        expect(tokenMock).toHaveBeenCalledWith("user-1", response)
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                user: {
                    userId: "user-1",
                    username: "person_name"
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
                username: "person_name",
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
                username: "person_name",
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
            createRequest({ username: "bad username!", password: "long-enough" }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(getUserMock).not.toHaveBeenCalled()
    })

    it("keeps legacy login passwords longer than 72 bytes compatible", async () => {
        const password = "a".repeat(80)
        getUserMock.mockResolvedValue({
            id: "user-1",
            username: "person_name",
            password: "hashed-password"
        })
        compareMock.mockResolvedValue(true)
        const response = createResponse()

        await login(
            createRequest({ username: "person_name", password }),
            response
        )

        expect(compareMock).toHaveBeenCalledWith(password, "hashed-password")
        expect(response.status).toHaveBeenCalledWith(200)
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
            username: "person_name",
            password: "hashed-password"
        })
        accountMock.mockResolvedValue(true)
        compareMock.mockResolvedValue(false)
        const response = createResponse()

        await login(
            createRequest({
                username: "person_name",
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
