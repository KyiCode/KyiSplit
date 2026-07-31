import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
    default: {
        query: vi.fn()
    }
}))

import database from "../db"
import { generateInvite, INVITE_DURATION_MS } from "./inviteGenerator"

const queryMock = vi.mocked(database.query)

beforeEach(() => {
    vi.clearAllMocks()
    process.env.FRONTEND_URL = "https://example.test"
})

describe("invite generator", () => {
    it("creates a link that expires exactly one hour later", async () => {
        queryMock.mockResolvedValue({ rows: [] } as never)
        const now = new Date("2026-07-31T02:00:00.000Z")

        const link = await generateInvite("group-1", "user-1", now)

        expect(link).toMatch(/^https:\/\/example\.test\/join\/[a-f0-9]{64}$/)
        const values = queryMock.mock.calls[0][1] as unknown[]
        expect(values[0]).toBe("group-1")
        expect(values[2]).toBe("user-1")
        expect((values[3] as Date).getTime() - now.getTime()).toBe(
            INVITE_DURATION_MS
        )
    })
})
