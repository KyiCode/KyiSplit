import database from "../db"
import { getExpenses, getExpenseTotal, getSplits } from "./queries"

// False if : user dont exist, user not in group, group dont exist
export async function isUserAuthorised(user: string, groupId: string) {
    const userInGroup = await database.query(
        'SELECT 1 FROM group_members WHERE  user_id = $1 AND group_id = $2',
        [user, groupId]
    )
    return userInGroup.rows.length > 0
}

export async function hasUser(userId: string) {
    const hasUser = await database.query(
        'SELECT 1 FROM users WHERE ID = $1',
        [userId]
    )
    return (hasUser.rows.length > 0)
}

export async function hasExpense(expenseId: string) {
    const hasExpense = await database.query(
        'SELECT 1 FROM expenses WHERE id = $1',
        [expenseId]
    )
    return hasExpense.rows.length > 0
}

export async function isValidSplit(expenseId: string, payers: { userId: string, amount: number }[]) {
    const total = await getExpenseTotal(expenseId)
    const sum = payers.reduce((acc: number, payer: { userId: string, amount: number }) => acc + payer.amount, 0)
    return (Math.abs(Math.round(sum * 100) - Math.round(total * 100)) <= 1)
}


// return boolean together with invalid expenses
export async function hasInvalidExpenses(groupId: string) {
    const expenses = await getExpenses(groupId)
    const { payments, splits } = await getSplits(expenses)
    const invalidExpenses = []

    for (const expense of expenses) {
        const relevantPayment = payments.filter(payment => payment.expense_id == expense)
        const paymentMap = relevantPayment.map(payment => ({ userId: payment.user_id, amount: Number(payment.amount) }))
        const relevantSplit = splits.filter(splt => splt.expense_id == expense)
        const splitMap = relevantSplit.map(splt => ({ userId: splt.user_id, amount: Number(splt.amount) }))
        const validBills = await isValidSplit(expense, paymentMap) && await isValidSplit(expense, splitMap)
        if (!validBills) invalidExpenses.push(expense)
    }

    return { hasInvalidExpense: invalidExpenses.length > 0, invalidExpenses }
}
