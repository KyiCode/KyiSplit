import type { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
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

vi.mock("../utils/validators", () => ({
    hasAccount: vi.fn()
}))

vi.mock("../utils/queries", () => ({
    getUser: vi.fn()
}))

vi.mock("../utils/tokenGenerator", () => ({
    default: vi.fn()
}))

import bcrypt from "bcryptjs"
import database from "../db"
import { getUser } from "../utils/queries"
import generateToken from "../utils/tokenGenerator"
import { hasAccount } from "../utils/validators"
import { login, signup, verifySession } from "./userController"

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
    it("rejects sign-up when credentials are missing", async () => {
        const request = createRequest({ email: "" })
        const response = createResponse()

        await signup(request, response)

        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            message: "Invalid email or password"
        })
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("rejects sign-up for an existing account", async () => {
        accountMock.mockResolvedValue(true)
        const request = createRequest({
            email: "person@example.com",
            password: "secret"
        })
        const response = createResponse()

        await signup(request, response)

        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
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
            password: "secret"
        })
        const response = createResponse()

        await signup(request, response)

        expect(hashMock).toHaveBeenCalledWith("secret", "salt")
        expect(queryMock).toHaveBeenCalledWith(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            ["person@example.com", "hashed-password"]
        )
        expect(response.status).toHaveBeenCalledWith(200)
    })

    it("returns a token after a successful login", async () => {
        getUserMock.mockResolvedValue({
            id: "user-1",
            email: "person@example.com",
            password: "hashed-password"
        })
        accountMock.mockResolvedValue(true)
        compareMock.mockResolvedValue(true)
        tokenMock.mockReturnValue("signed-token")
        const request = createRequest({
            email: "person@example.com",
            password: "secret"
        })
        const response = createResponse()

        await login(request, response)

        expect(compareMock).toHaveBeenCalledWith("secret", "hashed-password")
        expect(tokenMock).toHaveBeenCalledWith("user-1", response)
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            id: "user-1",
            email: "person@example.com",
            token: "signed-token"
        })
    })

    it("rejects an incorrect password", async () => {
        getUserMock.mockResolvedValue({
            id: "user-1",
            email: "person@example.com",
            password: "hashed-password"
        })
        accountMock.mockResolvedValue(true)
        compareMock.mockResolvedValue(false)
        const response = createResponse()

        await login(
            createRequest({ email: "person@example.com", password: "wrong" }),
            response
        )

        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            message: "Wrong password"
        })
        expect(tokenMock).not.toHaveBeenCalled()
    })

    it("verifies an authenticated session", async () => {
        const response = createResponse()

        await verifySession(createRequest({}), response)

        expect(response.json).toHaveBeenCalledWith({ status: "success" })
    })
})
