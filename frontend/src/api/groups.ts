import type { GroupMemberType } from "../interfaces/interface"
import { apiRequest } from "./client"
import type {
    CreateGroupData,
    CreateGroupRequest,
    GroupData,
    GroupListData,
    GroupMembersData,
    InviteData,
    JoinGroupData,
    JoinGroupRequest
} from "../../../backend/src/contracts/api"

export async function fetchGroups() {
    return apiRequest<GroupListData>("/api/groups/grouplist")
}

export async function createGroup(
    groupName: string,
    groupUserName: string,
    defaultCurrency: string
) {
    const body: CreateGroupRequest = {
        groupName,
        groupUserName,
        defaultCurrency
    }
    return apiRequest<CreateGroupData>("/api/groups/addgroup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
}

export async function fetchGroup(groupId: string) {
    return apiRequest<GroupData>(`/api/groups/${groupId}`)
}

export async function fetchGroupMembers(
    groupId: string
): Promise<GroupMemberType[]> {
    const data = await apiRequest<GroupMembersData>(
        `/api/groups/${groupId}/members`
    )
    return data.members
}

export async function generateInvite(groupId: string) {
    return apiRequest<InviteData>(`/api/groups/${groupId}/invite`, {
        method: "POST"
    })
}

export async function joinGroup(tokenId: string, userName: string) {
    const body: JoinGroupRequest = { userName }
    return apiRequest<JoinGroupData>(`/api/groups/join/${tokenId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
}
