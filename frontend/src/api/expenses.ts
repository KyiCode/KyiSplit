const BASE_URL = import.meta.env.VITE_BASE_URL;

export async function fetchExpenses(groupId: string) {
    try {
        const res = await fetch(`${BASE_URL}/api/expenses/${groupId}`, {
            credentials: "include",
        })
        return res.json()
    } catch (error) {
        console.log(error)
        throw error
    }

}