import type {
    FailureResponse,
    SuccessResponse
} from "../../../backend/src/contracts/api"

const BASE_URL = import.meta.env.VITE_BASE_URL || ""

type ErrorPayload = Partial<FailureResponse>

export class ApiError extends Error {
    readonly code?: string
    readonly status: number

    constructor(message: string, status: number, code?: string) {
        super(message)
        this.name = "ApiError"
        this.code = code
        this.status = status
    }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback
}

async function readJson(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) return null

    try {
        return await response.json()
    } catch {
        return null
    }
}

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    let response: Response
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            ...options,
            credentials: "include"
        })
    } catch {
        throw new ApiError(
            "Unable to reach KyiSplit. Check your connection and try again.",
            0
        )
    }

    const payload = await readJson(response)
    if (!response.ok) {
        const errorPayload = (
            payload && typeof payload === "object"
                ? payload
                : {}
        ) as ErrorPayload

        if (response.status === 401) {
            window.dispatchEvent(new Event("kyisplit:unauthorized"))
        }

        throw new ApiError(
            errorPayload.message || `Request failed (${response.status})`,
            response.status,
            errorPayload.code
        )
    }

    if (
        !payload ||
        typeof payload !== "object" ||
        (payload as { status?: unknown }).status !== "success" ||
        !("data" in payload)
    ) {
        throw new ApiError(
            "KyiSplit returned an invalid response.",
            502,
            "INTERNAL_ERROR"
        )
    }

    return (payload as SuccessResponse<T>).data
}
