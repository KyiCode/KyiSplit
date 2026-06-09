import { Request, Response } from "express"

import database from "../db"
import { getExpenses, getSplits, getUsersInGroup } from "../utils/queries"
import { areBillsAssigned } from "../utils/validators"

export const getBalance = async (req: Request, res: Response) => {
    console.log("calculating balance")
    const user = req.user.userId
    const groupId = req.params.groupId as string
    const targetCurrency = req.body
    // need to add currency type column, is there an api that calls currency from string?   

    // make nodes for each member
    // for each expense calculate who owe who and who paid
    // assign/update edges weight between nodes
    try {
        if (!user || !groupId || !targetCurrency) return res.status(400).json({ error: "bad request" })


        const users = await getUsersInGroup(groupId)



        const expenseIds = await getExpenses(groupId)  // error here?
        const { payments, splits } = await getSplits(expenseIds)


        const { hasUnassigned, missingExpenses } = (await areBillsAssigned(groupId))

        return res.status(200).json({
            users: users,
            expenseIds: expenseIds,
            payments: payments,
            bill: missingExpenses
        }
        )
    } catch (error) {
        console.log(error)
    }

}