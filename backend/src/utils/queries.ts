import database from "../db"

export async function getUsersInGroup(groupId: string) {
    const usersResult = await database.query(
        'SELECT user_id FROM group_members WHERE group_id = $1',
        [groupId]
    )
    return usersResult.rows.map((user) => user.user_id)
}

export async function getGroupIdByExpense(expenseId: String) {
    const groupIdResult = await database.query(
        'SELECT group_id FROM expenses WHERE id = $1',
        [expenseId]
    )
    const groupId = groupIdResult.rows[0].group_id
    return groupId
}

export async function getExpenseTotal(expenseId: string) {
    const totalResult = await database.query(
        'SELECT total FROM expenses WHERE id = $1',
        [expenseId]
    )
    return Number(totalResult.rows[0].total)
}

export async function getExpenses(groupId: string) {
    const expenseListResult = await database.query(
        'SELECT * FROM expenses WHERE group_id = $1',
        [groupId]
    )
    return expenseListResult.rows
}

export async function getSplits(expenses: string[]) {
    // promise returns array, hence []. promise runs queries concurrently. ANY allows array matching
    const [paymentResult, splitResult] = await Promise.all([
        database.query('SELECT * FROM payments WHERE expense_id = ANY($1)', [expenses]),
        database.query('SELECT * FROM splits WHERE expense_id = ANY($1)', [expenses])
    ])
    return { payments: paymentResult.rows, splits: splitResult.rows }
}

export async function getCurrency(expenseId: string) {
    const currencyRes = await database.query('SELECT currency FROM expenses WHERE id = $1', [expenseId])
    const currency = currencyRes.rows[0].currency
    return currency
}

export async function getUser(email: string) {
    const user = await database.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    )
    return user.rows[0]
}

export async function getUserGroups(userId: string) {
    const groupResults = await database.query(
        'SELECT * FROM group_members WHERE user_id = $1',
        [userId]
    )
    return groupResults.rows
}

export async function getGroupName(groupId: string) {
    const groupName = await database.query(
        'SELECT name FROM groups WHERE id = $1',
        [groupId]
    )
    return groupName.rows[0].name
}

export async function getGroupMembers(groupId: string) {
    const groupMembers = await database.query(
        'SELECT * FROM group_members WHERE group_id = $1',
        [groupId]
    )
    return groupMembers.rows.map((groupMember) => ({
        userId: groupMember.user_id,
        userGroupName: groupMember.user_group_name
    }))
}