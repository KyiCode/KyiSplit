import type { BalanceData } from "../../../backend/src/contracts/api"
import { apiRequest } from "./client"

export async function fetchBalance(groupId: string) {
    return apiRequest<BalanceData>(
        `/api/groups/${groupId}/getbalance`
    )
}
