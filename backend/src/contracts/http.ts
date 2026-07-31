import type { Response } from "express"

import type {
    ApiErrorCode,
    FailureResponse,
    SuccessResponse
} from "./api"

export function sendSuccess<T>(
    response: Response,
    status: number,
    data: T
) {
    return response.status(status).json({
        status: "success",
        data
    } satisfies SuccessResponse<T>)
}

export function sendFailure(
    response: Response,
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string>
) {
    const payload: FailureResponse = {
        status: "fail",
        code,
        message
    }
    if (fields) payload.fields = fields
    return response.status(status).json(payload)
}
