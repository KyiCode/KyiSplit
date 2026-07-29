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

export async function createExpense(groupId: string, expenseName: string, expenseTotal: string,
    expenseDate: string, expenseCurrency: string, amountPaid: Record<string, string | number>, amountSplit: Record<string, string | number>) {
    try {
        const res = await fetch(`${BASE_URL}/api/expenses/addexpense`, {
            credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                groupId,
                expenseName,
                expenseTotal,
                expenseDate,
                expenseCurrency,
                paidBy: Object.entries(amountPaid).map(([userId, amount]) => ({ userId, amount: Number(amount) })),
                splits: Object.entries(amountSplit).map(([userId, amount]) => ({ userId, amount: Number(amount) })),
            })
        })
        return res.json()
    } catch (error) {
        console.log(error)
    }
}
