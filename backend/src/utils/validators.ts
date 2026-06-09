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

export async function hasUnassignedBills(groupId: string) {
    const expenses = await getExpenses(groupId)
    const { payments, splits } = await getSplits(expenses)

    const paymentsExpenseIds = payments.map(payment => payment.expense_id)
    const splitsExpenseIds = splits.map(split => split.expense_id)

    console.log(payments)
    const missingExpenses = expenses.filter(expense => !paymentsExpenseIds.includes(expense) || !splitsExpenseIds.includes(expense))

    for (const expense of expenses) {
        const relevantPayment = payments.filter(payment => payment.expense_id == expense)
        const paymentMap = relevantPayment.map(payment => ({ userId: payment.user_id, amount: Number(payment.amount) }))
        const relevantPayment = payments.filter(payment => payment.expense_id == expense)
        const paymentMap = relevantPayment.map(payment => ({ userId: payment.user_id, amount: Number(payment.amount) }))
    }


    return { hasUnassigned: missingExpenses.length > 0, missingExpenses }
}
