import type {
    CreateRepaymentData,
    CreateRepaymentRequest,
    DeleteRepaymentData,
    RepaymentListData
} from "../../../backend/src/contracts/api"
import { apiRequest } from "./client"

export async function fetchRepayments(groupId: string) {
    return apiRequest<RepaymentListData>(
        `/api/groups/${groupId}/repayments`
    )
}

export async function createRepayment(
    groupId: string,
    body: CreateRepaymentRequest
) {
    return apiRequest<CreateRepaymentData>(
        `/api/groups/${groupId}/repayments`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }
    )
}

export async function deleteRepayment(
    groupId: string,
    repaymentId: string
) {
    return apiRequest<DeleteRepaymentData>(
        `/api/groups/${groupId}/repayments/${repaymentId}`,
        { method: "DELETE" }
    )
}
