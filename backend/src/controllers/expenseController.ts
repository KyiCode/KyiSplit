import express from 'express'

import { Request, Response } from 'express'
import database from '../db'

// False if : user dont exist, user not in group, group dont exist
async function isUserAuthorised(user: string, groupId: string) {
    const userInGroup = await database.query(
        'SELECT 1 FROM group_members WHERE  user_id = $1 AND group_id = $2',
        [user, groupId]
    )
    return userInGroup.rows.length > 0
}

async function hasUser(userId: string) {
    const hasUser = await database.query(
        'SELECT 1 FROM users WHERE ID = $1',
        [userId]
    )
    return (hasUser.rows.length > 0)
}

async function hasExpense(expenseId: string) {
    const hasExpense = await database.query(
        'SELECT 1 FROM expenses WHERE id = $1',
        [expenseId]
    )
    return hasExpense.rows.length > 0
}

async function isValidGroup(expenseId: String) {
    const groupIdResult = await database.query(
        'SELECT group_id FROM expenses WHERE id = $1',
        [expenseId]
    )
    const groupId = groupIdResult.rows[0].group_id
    return groupId
}

async function queryTotal(expenseId: string) {
    const totalResult = await database.query(
        'SELECT total FROM expenses WHERE id = $1',
        [expenseId]
    )
    return Number(totalResult.rows[0].total)
}

async function isValidSplit(expenseId: string, payers: { userId: string, amount: number }[]) {
    const total = await queryTotal(expenseId)
    const sum = payers.reduce((acc: number, payer: { userId: string, amount: number }) => acc + payer.amount, 0)
    return (Math.abs(Math.round(sum * 100) - Math.round(total * 100)) <= 1)
}

export const addExpense = async (req: Request, res: Response) => {
    console.log("adding expense")
    const { groupId, expenseName, expenseAmount, date } = req.body
    const user = req.user.userId
    try {
        const amount = Number(expenseAmount)

        if (!expenseName || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid expense amount' })
        if (!(await isUserAuthorised(user, groupId))) return res.status(400).json({ error: 'User not in group or No such group' })

        const currDate = date ? date : new Date().toISOString().split('T')[0];
        const result = await database.query(
            'INSERT INTO expenses (group_id, name, total, date) VALUES ($1, $2, $3, $4) RETURNING id',
            [groupId, expenseName, amount, currDate]
        )
        return res.status(201).json({ message: 'success' })
    } catch (error) {
        console.log(error)
        return res.status(501).json({ error: 'Server error adding expense' })
    }
}

export const addPayer = async (req: Request, res: Response) => {
    console.log("adding payer")
    const user = req.user.userId
    const { expenseId, payers } = req.body
    try {
        if (!expenseId || !payers) return res.status(400).json({ error: "request error" })
        if (await hasExpense(expenseId)) return res.status(400).json({ error: "expense do not exist" })

        const groupId = await isValidGroup(expenseId)
        if (!groupId) return res.status(400)

        if (!(await isUserAuthorised(user, groupId))) return res.status(400).json({ error: 'User not in group or No such group' })

        // // payers = [userId, amount]
        if (!(await isValidSplit(expenseId, payers))) return res.status(400).json({ error: "Payments don't match total" })

        for (const payer of payers) {
            let user = payer.userId
            let amount = Number(payer.amount)

            if (!user || amount < 0) return res.status(400).json({ error: "empty user or invalid amount" })

            if (!(await hasUser(user))) return res.status(400).json({ error: "no user" })

            const userInGroup = await database.query(
                'SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2',
                [user, groupId]
            )
            if (userInGroup.rows.length == 0) return res.status(400).json({ error: "user not in group" })
        }

        for (const payer of payers) {
            let user = payer.userId
            let amount = Number(payer.amount)
            if (amount == 0) continue

            await database.query(
                `INSERT INTO payments (expense_id, user_id, amount) VALUES ($1, $2, $3)
                ON CONFLICT (expense_id, user_id)
                DO UPDATE SET amount = EXCLUDED.amount`,
                [expenseId, user, amount]
            )
            console.log(`Added payer: ${user} amount:${amount}`)
        }
        return res.status(201).json({ message: 'success' })
    } catch (error) {
        console.log(error)
        return res.status(501).json({ error: 'Server error adding payer' })
    }
}

export const addSplit = async (req: Request, res: Response) => {
    console.log("adding splits")
    const user = req.user.userId
    const { expenseId, splits } = req.body
    try {
        if (!expenseId || !splits) return res.status(400).json({ error: "request error" })
        if (await hasExpense(expenseId)) return res.status(400).json({ error: "expense do not exist" })

        const groupId = await isValidGroup(expenseId)
        if (!groupId) return res.status(400)

        if (!(await isUserAuthorised(user, groupId))) return res.status(400).json({ error: 'User not in group or No such group' })

        // // payers = [userId, amount]
        if (!(await isValidSplit(expenseId, splits))) return res.status(400).json({ error: "Payments don't match total" })

        for (const asignee of splits) {
            let user = asignee.userId
            let amount = Number(asignee.amount)

            if (!user || amount < 0) return res.status(400).json({ error: "empty user or invalid amount" })

            if (!(await hasUser(user))) return res.status(400).json({ error: "no user" })

            const userInGroup = await database.query(
                'SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2',
                [user, groupId]
            )
            if (userInGroup.rows.length == 0) return res.status(400).json({ error: "user not in group" })
        }

        for (const asignee of splits) {
            let user = asignee.userId
            let amount = Number(asignee.amount)
            if (amount == 0) continue

            await database.query(
                `INSERT INTO splits (expense_id, user_id, amount) VALUES ($1, $2, $3)
                ON CONFLICT (expense_id, user_id)
                DO UPDATE SET amount = EXCLUDED.amount`,
                [expenseId, user, amount]
            )
            console.log(`Added assignee: ${user} amount:${amount}`)
        }
        return res.status(201).json({ message: 'success' })
    } catch (error) {
        console.log(error)
        return res.status(501).json({ error: 'Server error adding splits' })
    }
}

export const getExpenseList = async (req: Request, res: Response) => {
    console.log("getting expense list")
    const user = req.user.userId
    const { groupId } = req.body
    try {
        if (!groupId) return res.status(400).json({ error: "request error" })
        if (!(await hasUser(user))) return res.status(400).json({ error: "no user" })
        if (!(await isUserAuthorised(user, groupId))) return res.status(400).json({ error: "user not authorised or group do not exist" })

        const expenseListResult = await database.query(
            'SELECT * FROM expenses WHERE group_id = $1',
            [groupId]
        )
        const expenseId = expenseListResult.rows.map((expenses) => expenses.id)

        interface paymentData {
            expense_id: string,
            user_id: string,
            amount: number
        }
        let paymentArr: paymentData[] = []
        let splitArr: paymentData[] = []

        for (const expense of expenseId) {
            const paymentResult = await database.query('SELECT * FROM payments WHERE expense_id = $1', [expense])
            const splitResult = await database.query('SELECT * FROM splits WHERE expense_id = $1', [expense])
            paymentArr.push(...paymentResult.rows)
            splitArr.push(...splitResult.rows)
        }

        return res.status(200).json({
            expenseId: expenseId,
            payments: paymentArr,
            splits: splitArr
        })
    } catch (error) {
        console.log(error)
        return res.status(501).json({ error: 'Server error getting expenses' })
    }
}
