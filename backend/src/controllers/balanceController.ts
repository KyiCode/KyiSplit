import { Request, Response } from "express"

import { getExpenses, getSplits, getUsersInGroup } from "../utils/queries"
import { hasInvalidExpenses } from "../utils/validators"
import { convertCurrency } from "../utils/currencyServices"
import { MaxPriorityQueue } from '@datastructures-js/priority-queue';
import { calculateBalance } from "../utils/balanceServices";

export const getBalance = async (req: Request, res: Response) => {
    console.log("calculating balance")
    const user = req.user.userId
    const groupId = req.params.groupId as string
    const targetCurrency = req.body.currency
    if (!user || !groupId || !targetCurrency) return res.status(400).json({ error: "bad request" })

    try {
        const transactions = await calculateBalance(groupId, targetCurrency)
        return res.json(transactions)
    } catch (error) {
        console.log(error)
    }
}

