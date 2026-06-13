import express from 'express'
import { Request, Response } from 'express'
import database from '../db'

import { isUserAuthorised, hasUser, hasExpense, isValidSplit } from '../utils/validators'
import { getExpenses, getGroupIdByExpense, getSplits } from '../utils/queries'

export const addExpense = async (req: Request, res: Response) => {
    console.log("adding expense")
    const { groupId, expenseName, expenseAmount, date } = req.body
    const user = req.user.userId
    try {
        const amount = Number(expenseAmount)

        if (!expenseName || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid expense amount' })
        if (!(await isUserAuthorised(user, groupId))) return res.status(400).json({ error: 'User not in group or No such group' })

        const currDate = date ? date : new Date().toISOString().split('T')[0];

        // return expense id
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

        const groupId = await getGroupIdByExpense(expenseId)
        if (!groupId) return res.status(400)

        if (!(await isUserAuthorised(user, groupId))) return res.status(400).json({ error: 'User not in group or No such group' })

        // // payers = [userId, amount]
        if (!(await isValidSplit(expenseId, payers))) return res.status(400).json({ error: "Payments don't match total" })

        for (const payer of payers) {
            let user = payer.userId
            let amount = Number(payer.amount)

            if (!user || amount < 0) return res.status(400).json({ error: "empty user or invalid amount" })
            if (!(await hasUser(user))) return res.status(400).json({ error: "no user" })
            if (!(await isUserAuthorised(user, groupId))) return res.status(400).json({ error: "user not in group" })
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

        const groupId = await getGroupIdByExpense(expenseId)
        if (!groupId) return res.status(400)

        if (!(await isUserAuthorised(user, groupId))) return res.status(400).json({ error: 'User not in group or No such group' })

        // // payers = [userId, amount]
        if (!(await isValidSplit(expenseId, splits))) return res.status(400).json({ error: "Payments don't match total" })

        for (const asignee of splits) {
            let user = asignee.userId
            let amount = Number(asignee.amount)

            if (!user || amount < 0) return res.status(400).json({ error: "empty user or invalid amount" })
            if (!(await hasUser(user))) return res.status(400).json({ error: "no user" })
            if (!(await isUserAuthorised(user, groupId))) return res.status(400).json({ error: "user not in group" })
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
    const groupId = req.params.groupId as string
    try {
        if (!groupId) return res.status(400).json({ error: "request error" })
        if (!(await hasUser(user))) return res.status(400).json({ error: "no user" })
        if (!(await isUserAuthorised(user, groupId))) return res.status(400).json({ error: "user not authorised or group do not exist" })

        const expenses = await getExpenses(groupId)
        // const { payments, splits } = await getSplits(expenses.expenseId)
        const mappedExpenses = expenses.map(e => ({
            expenseId: e.id,
            groupId: e.group_id,
            expenseName: e.name,
            expenseTotal: e.total,
            date: e.date,
            createdAt: e.created_at,
            currency: e.currency
        }))
        return res.status(200).json({ status: "success", mappedExpenses})  //{expenseId: expenses.id, expenseName: expenses.name}
    } catch (error) {
        console.log(error)
        return res.status(501).json({ error: 'Server error getting expenses' })
    }
}
