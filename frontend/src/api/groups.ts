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

export async function createGroup(groupName: string) {
    try {
        const res = await fetch(`${BASE_URL}/api/groups/addgroup`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupName })
        })
        return res.json()
    } catch (error) {
        console.error("Failed to fetch groups:", error)
        throw error  // re-throw so the caller knows it failed
    }
}

export async function enterGroup(groupId: string) {
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