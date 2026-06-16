const BASE_URL = import.meta.env.VITE_BASE_URL;

export async function fetchGroups() {
    try {
        const res = await fetch(`${BASE_URL}/api/groups/grouplist`, {
            credentials: "include"
        })
        if (!res) throw new Error(`HTTP error`)
        return res.json()

    } catch (error) {
        console.error("Failed to fetch groups:", error)
        throw error  // re-throw so the caller knows it failed
    }
}

export async function createGroup(groupName: string, groupUserName: string) {
    try {
        const res = await fetch(`${BASE_URL}/api/groups/addgroup`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupName , groupUserName})
        })
        return res.json()
    } catch (error) {
        console.error("Failed to fetch groups:", error)
        throw error  // re-throw so the caller knows it failed
    }
}

export async function fetchGroup(groupId: string) {
    try {
        const res = await fetch(`${BASE_URL}/api/groups/${groupId}`, {
            credentials: "include",
        })
        return res.json()
    } catch (error) {
        console.error("Failed to fetch groups:", error)
        throw error  // re-throw so the caller knows it failed
    }
}

// export async function fetchUserName(groupId: string) {
//     try {
//         const res = fetchGroupMembers(groupId)
//         res
//     }

// }

export async function fetchGroupMembers(groupId: string) {
    try {
        const res = await fetch(`${BASE_URL}/api/groups/${groupId}/members`, {
            credentials: "include",
        })
        return res.json()
    } catch (error) {
        console.error("Failed to fetch group members:", error)
        throw error  // re-throw so the caller knows it failed
    }
}

export async function generateInvite(groupId: string) {
    try {
        const res = await fetch(`${BASE_URL}/api/groups/${groupId}/invite`, {
            credentials: "include",
            method: "POST"
        })
        return res.json()
    } catch (error) {
        console.error("Failed to generate invite:", error)
        throw error  // re-throw so the caller knows it failed
    }
}

export async function joinGroup(tokenId: string, userName: string) {
    try {
        const res = await fetch(`${BASE_URL}/api/groups/join/${tokenId}`, {
            credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({userName})
        })
        return res.json()
    } catch (error) {
        console.error("Failed to generate invite:", error)
        throw error  // re-throw so the caller knows it failed
    }

}