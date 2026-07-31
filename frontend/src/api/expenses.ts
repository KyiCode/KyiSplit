import { apiRequest } from "./client"
import type {
    CreateExpenseData,
    CreateExpenseRequest,
    DeleteExpenseData,
    ExpenseListData
} from "../../../backend/src/contracts/api"

export async function fetchExpenses(groupId: string) {
    return apiRequest<ExpenseListData>(`/api/expenses/${groupId}`)
}

export async function createExpense(groupId: string, expenseName: string, expenseTotal: string,
    expenseDate: string, expenseCurrency: string, amountPaid: Record<string, string | number>, amountSplit: Record<string, string | number>) {
    const body: CreateExpenseRequest = {
        groupId,
        expenseName,
        expenseTotal,
        expenseDate,
        expenseCurrency,
        paidBy: Object.entries(amountPaid).map(([userId, amount]) => ({
            userId,
            amount
        })),
        splits: Object.entries(amountSplit).map(([userId, amount]) => ({
            userId,
            amount
        }))
    }
    return apiRequest<CreateExpenseData>("/api/expenses/addexpense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
}

export async function deleteExpense(
    groupId: string,
    expenseId: string
) {
    return apiRequest<DeleteExpenseData>(
        `/api/expenses/${groupId}/${expenseId}`,
        { method: "DELETE" }
    )
}
