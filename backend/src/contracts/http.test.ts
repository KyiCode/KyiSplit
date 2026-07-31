import type { Response } from "express"
import { describe, expect, it, vi } from "vitest"

import { sendFailure, sendSuccess } from "./http"

function createResponse() {
    const response = {
        json: vi.fn(),
        status: vi.fn()
    }
    response.status.mockReturnValue(response)
    return response as unknown as Response
}

describe("shared HTTP envelopes", () => {
    it("wraps successful data consistently", () => {
        const response = createResponse()

        sendSuccess(response, 201, { groupId: "group-1" })

        expect(response.status).toHaveBeenCalledWith(201)
        expect(response.json).toHaveBeenCalledWith({
            status: "success",
            data: { groupId: "group-1" }
        })
    })

    it("emits a stable safe error", () => {
        const response = createResponse()

        sendFailure(
            response,
            400,
            "VALIDATION_ERROR",
            "Invalid group details",
            { groupName: "Required" }
        )

        expect(response.status).toHaveBeenCalledWith(400)
        expect(response.json).toHaveBeenCalledWith({
            status: "fail",
            code: "VALIDATION_ERROR",
            message: "Invalid group details",
            fields: { groupName: "Required" }
        })
    })
})
