import { Request, Response } from "express"

import database from "../db"
import { getCurrency, getExpenses, getSplits, getUsersInGroup } from "../utils/queries"
import { hasInvalidExpenses } from "../utils/validators"
import { convertCurrency, getExchangeRate } from "../utils/currencyServices"

export const getBalance = async (req: Request, res: Response) => {
    console.log("calculating balance")
    const user = req.user.userId
    const groupId = req.params.groupId as string
    const targetCurrency = req.body.currency
    // need to add currency type column, is there an api that calls currency from string?   

    // make nodes for each member
    // for each expense calculate who owe who and who paid
    // assign/update edges weight between nodes
    try {
        console.log(targetCurrency)
        // console.log("cool")
        if (!user || !groupId || !targetCurrency) return res.status(400).json({ error: "bad request" })

        const usersPaid = new Map<String, number>()
        const usersOwed = new Map<String, number>()
        const usersNet = new Map<String, number>()

        const usersInGroup = await getUsersInGroup(groupId)
        usersInGroup.map(userId => {
            usersPaid.set(userId, 0)
            usersOwed.set(userId, 0)
        })

        const expenseIds = await getExpenses(groupId)  // error here?
        const { payments, splits } = await getSplits(expenseIds)

        // const { hasInvalidExpense, invalidExpenses } = await hasInvalidExpenses(groupId)
        // if (hasInvalidExpense) return res.status(400).json({ error: "invalid or incomplete expenses", invalidExpenses: invalidExpenses })

        const normalisedPayments = await convertCurrency(payments, targetCurrency)
        const normalisedSplits = await convertCurrency(splits, targetCurrency)

        normalisedPayments.map(payment => {
            const userPaid = usersPaid.get(payment.user_id)
            usersPaid.set(payment.user_id, userPaid! + payment.amount)
        })

        normalisedSplits.map(split => {
            const userOwed = usersOwed.get(split.user_id)
            usersOwed.set(split.user_id, userOwed! + split.amount)
        })

        usersInGroup.map(user =>
            usersNet.set(user, usersPaid.get(user)! - usersOwed.get(user)!)
        )

        console.log(usersNet)
        return res.json(usersNet)
    } catch (error) {
        console.log(error)
    }
}

