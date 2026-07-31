import type { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
    default: {
        connect: vi.fn(),
        query: vi.fn()
    }
}))

vi.mock("../utils/queries", () => ({
    getGroupDetails: vi.fn(),
    getGroupName: vi.fn(),
    getUserGroups: vi.fn(),
    queryGroupMembers: vi.fn()
}))

vi.mock("../utils/validators", () => ({
    isUserAuthorised: vi.fn(),
    isValidInvite: vi.fn()
}))

vi.mock("../utils/inviteGenerator", () => ({
    generateInvite: vi.fn()
}))

import database from "../db"
import { generateInvite } from "../utils/inviteGenerator"
import {
    getGroupDetails,
    getUserGroups,
    queryGroupMembers
} from "../utils/queries"
import { isUserAuthorised, isValidInvite } from "../utils/validators"
import {
    addGroup,
    getGroup,
    getGroupList,
    getGroupMembers,
    getInvite,
    joinGroup
} from "./groupController"

const authorisedMock = vi.mocked(isUserAuthorised)
const getGroupDetailsMock = vi.mocked(getGroupDetails)
const getUserGroupsMock = vi.mocked(getUserGroups)
const inviteMock = vi.mocked(generateInvite)
const inviteValidationMock = vi.mocked(isValidInvite)
const membersMock = vi.mocked(queryGroupMembers)
const connectMock = vi.mocked(database.connect)
const queryMock = vi.mocked(database.query)
const clientQueryMock = vi.fn()
const releaseMock = vi.fn()

function createResponse() {
    const response = {
        json: vi.fn(),
        status: vi.fn()
    }
    response.status.mockReturnValue(response)
    return response as unknown as Response
}

function createRequest({
    body = {},
    groupId = "group-1",
    token = "invite-token",
    userId = "user-1"
}: {
    body?: Record<string, unknown>
    groupId?: string
    token?: string
    userId?: string
} = {}) {
    return {
        body,
        params: { groupId, token },
        user: { userId }
    } as unknown as Request
}

beforeEach(() => {
    vi.clearAllMocks()
    connectMock.mockResolvedValue({
        query: clientQueryMock,
        release: releaseMock
    } as never)
})

describe("group authorization", () => {
    it.each([
        ["group details", getGroup, getGroupDetailsMock],
        ["member list", getGroupMembers, membersMock],
        ["invite creation", getInvite, inviteMock]
    ])("denies a non-member before reading %s", async (_name, handler, protectedWork) => {
        authorisedMock.mockResolvedValue(false)
        const response = createResponse()

        await handler(createRequest(), response)

        expect(response.status).toHaveBeenCalledWith(403)
        expect(protectedWork).not.toHaveBeenCalled()
    })

    it("waits for authorization before returning group members", async () => {
        let resolveAuthorization: (value: boolean) => void = () => undefined
        authorisedMock.mockReturnValue(
            new Promise(resolve => {
                resolveAuthorization = resolve
            })
        )
        membersMock.mockResolvedValue([])
        const response = createResponse()

        const pending = getGroupMembers(createRequest(), response)
        await Promise.resolve()

        expect(membersMock).not.toHaveBeenCalled()
        resolveAuthorization(false)
        await pending
        expect(response.status).toHaveBeenCalledWith(403)
    })

    it("allows a member to create an invite", async () => {
        authorisedMock.mockResolvedValue(true)
        inviteMock.mockResolvedValue("https://example.test/join/invite-token")
        const response = createResponse()

        await getInvite(createRequest(), response)

        expect(inviteMock).toHaveBeenCalledWith("group-1", "user-1")
        expect(response.status).toHaveBeenCalledWith(200)
    })
})

describe("group and invitation input", () => {
    it.each([
        ["", "Kai"],
        ["x".repeat(101), "Kai"],
        ["Trip", ""],
        ["Trip", "x".repeat(51)]
    ])("rejects invalid group/display names", async (groupName, groupUserName) => {
        const response = createResponse()

        await addGroup(
            createRequest({ body: { groupName, groupUserName } }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(connectMock).not.toHaveBeenCalled()
        expect(queryMock).not.toHaveBeenCalled()
    })

    it.each([
        undefined,
        "",
        "sgd",
        "US",
        "USDD",
        " USD "
    ])("rejects invalid group currency %# before a transaction", async defaultCurrency => {
        const response = createResponse()

        await addGroup(
            createRequest({
                body: {
                    groupName: "Trip",
                    groupUserName: "Kai",
                    defaultCurrency
                }
            }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(connectMock).not.toHaveBeenCalled()
    })

    it("creates a group and creator membership on one transaction client", async () => {
        clientQueryMock.mockImplementation(async query => {
            if (
                typeof query === "string" &&
                query.includes("INSERT into groups")
            ) {
                return { rows: [{ id: "group-1" }] }
            }
            return { rows: [] }
        })
        const response = createResponse()

        await addGroup(
            createRequest({
                body: {
                    groupName: " Trip ",
                    groupUserName: " Kai ",
                    defaultCurrency: "USD"
                }
            }),
            response
        )

        expect(clientQueryMock.mock.calls.map(call => call[0])).toEqual([
            "BEGIN",
            expect.stringContaining("INSERT into groups"),
            expect.stringContaining("INSERT into group_members"),
            "COMMIT"
        ])
        expect(clientQueryMock).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("INSERT into groups"),
            ["Trip", "USD"]
        )
        expect(clientQueryMock).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining("INSERT into group_members"),
            ["user-1", "group-1", "Kai"]
        )
        expect(queryMock).not.toHaveBeenCalled()
        expect(releaseMock).toHaveBeenCalledOnce()
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                message: "Group Added",
                groupId: "group-1",
                defaultCurrency: "USD"
            }
        })
    })

    it("rolls back and releases when creator membership fails", async () => {
        clientQueryMock.mockImplementation(async query => {
            if (
                typeof query === "string" &&
                query.includes("INSERT into groups")
            ) {
                return { rows: [{ id: "group-1" }] }
            }
            if (
                typeof query === "string" &&
                query.includes("INSERT into group_members")
            ) {
                throw new Error("membership failed")
            }
            return { rows: [] }
        })
        const response = createResponse()

        await addGroup(
            createRequest({
                body: {
                    groupName: "Trip",
                    groupUserName: "Kai",
                    defaultCurrency: "USD"
                }
            }),
            response
        )

        expect(clientQueryMock).toHaveBeenCalledWith("ROLLBACK")
        expect(clientQueryMock).not.toHaveBeenCalledWith("COMMIT")
        expect(releaseMock).toHaveBeenCalledOnce()
        expect(response.status).toHaveBeenCalledWith(500)
    })

    it("returns stored currency in group list and group detail responses", async () => {
        getUserGroupsMock.mockResolvedValue([
            { group_id: "group-1" }
        ] as never)
        getGroupDetailsMock.mockResolvedValue({
            groupName: "Trip",
            defaultCurrency: "JPY"
        })
        membersMock.mockResolvedValue([])

        const listResponse = createResponse()
        await getGroupList(createRequest(), listResponse)

        expect(listResponse.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                userId: "user-1",
                groups: [{
                    groupId: "group-1",
                    groupName: "Trip",
                    groupMembers: [],
                    defaultCurrency: "JPY"
                }]
            }
        })

        authorisedMock.mockResolvedValue(true)
        const detailResponse = createResponse()
        await getGroup(createRequest(), detailResponse)
        expect(detailResponse.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                groupName: "Trip",
                defaultCurrency: "JPY"
            }
        })
    })

    it.each([
        [{ isValid: false, reason: "not_found" }, 404],
        [{ isValid: false, reason: "expired" }, 410]
    ])("returns a distinct response for invalid invite %#", async (validation, status) => {
        inviteValidationMock.mockResolvedValue(validation as never)
        const response = createResponse()

        await joinGroup(
            createRequest({ body: { userName: "Kai" } }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(status)
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("rejects an already joined user without inserting", async () => {
        inviteValidationMock.mockResolvedValue({
            isValid: true,
            groupId: "group-1"
        } as never)
        authorisedMock.mockResolvedValue(true)
        const response = createResponse()

        await joinGroup(
            createRequest({ body: { userName: "Kai" } }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(409)
        expect(queryMock).not.toHaveBeenCalled()
    })

    it("allows the same invite to add distinct users", async () => {
        inviteValidationMock.mockResolvedValue({
            isValid: true,
            groupId: "group-1"
        } as never)
        authorisedMock.mockResolvedValue(false)
        queryMock.mockResolvedValue({ rows: [] } as never)

        const firstResponse = createResponse()
        await joinGroup(
            createRequest({
                body: { userName: "Kai" },
                userId: "user-1"
            }),
            firstResponse
        )
        const secondResponse = createResponse()
        await joinGroup(
            createRequest({
                body: { userName: "Sam" },
                userId: "user-2"
            }),
            secondResponse
        )

        expect(queryMock).toHaveBeenCalledTimes(2)
        expect(queryMock).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("INSERT INTO group_members"),
            ["group-1", "user-1", "Kai"]
        )
        expect(queryMock).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("INSERT INTO group_members"),
            ["group-1", "user-2", "Sam"]
        )
    })

    it("rejects an invalid display name before invite lookup", async () => {
        const response = createResponse()

        await joinGroup(
            createRequest({ body: { userName: " ".repeat(10) } }),
            response
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(inviteValidationMock).not.toHaveBeenCalled()
    })
})
