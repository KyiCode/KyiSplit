import { getExpenses, getSplits, getUsersInGroup } from "../utils/queries"
import { hasInvalidExpenses } from "../utils/validators"
import { convertCurrency } from "../utils/currencyServices"
import { MaxPriorityQueue } from '@datastructures-js/priority-queue';

export function initialiseMappings(usersInGroup: string[]) {
    const newMap = new Map<string, number>()
    usersInGroup.forEach(userId => { newMap.set(userId, 0) })
    return newMap
}
export function populateMap(usersInGroup: string[], paidBills: { user_id: string, amount: number }[], splitBills: { user_id: string, amount: number }[]) {
    const payerBillMap = initialiseMappings(usersInGroup)
    const owerBillMap = initialiseMappings(usersInGroup)
    paidBills.forEach(bill => {
        const userPaid = payerBillMap.get(bill.user_id)
        payerBillMap.set(bill.user_id, userPaid! + bill.amount)
    })
    splitBills.forEach(bill => {
        const userOwed = owerBillMap.get(bill.user_id)
        owerBillMap.set(bill.user_id, userOwed! + bill.amount)
    })
    return { payerBillMap, owerBillMap }
}

export function populateHeap(usersInGroup: string[], paidMappings: Map<string, number>, splitMappings: Map<string, number>) {
    const usersNet = new Map<string, number>()
    usersInGroup.forEach(user => usersNet.set(user, paidMappings.get(user)! - splitMappings.get(user)!))

    const owerHeap = new MaxPriorityQueue<{ userId: string, amount: number }>(item => item.amount)
    const receiverHeap = new MaxPriorityQueue<{ userId: string, amount: number }>(item => item.amount)

    const sum = usersInGroup.reduce((acc, user) => usersNet.get(user)! + acc, 0)
    // if (!sum || Math.abs(sum) > 0.01) return res.status(400).json({ error: "expense do not balance" })
    for (const user of usersInGroup) {
        if (usersNet.get(user)! > 0) receiverHeap.push({ userId: user, amount: usersNet.get(user)! })
        if (usersNet.get(user)! < 0) owerHeap.push({ userId: user, amount: Math.abs(usersNet.get(user)!) })
    }
    return { receiverHeap, owerHeap }
}

export function computeLeastTransactions(receiverHeap: MaxPriorityQueue<{ userId: string, amount: number }>, owerHeap: MaxPriorityQueue<{ userId: string, amount: number }>) {
    const transactions: { payingUserId: string, receivingUserId: string, amount: number }[] = []
    while (true) {
        const paying = owerHeap.pop()
        const receiving = receiverHeap.pop()
        if (!paying && !receiving) {
            break
        }
        if (!paying || !receiving) {
            throw new Error("Heap mismatch during settlement")
        }
        const payer = paying.userId
        const payAmount = paying.amount
        const receiver = receiving.userId
        const receiveAmount = receiving.amount

        if (payAmount > receiveAmount) {
            owerHeap.push({ userId: payer, amount: payAmount - receiveAmount })
        } else if (payAmount < receiveAmount) {
            receiverHeap.push({ userId: receiver, amount: receiveAmount - payAmount })
        }
        transactions.push({ payingUserId: payer, receivingUserId: receiver, amount: Math.min(receiveAmount, payAmount) })
    }
    return transactions
}

export async function calculateBalance(groupId: string, targetCurrency: string) {
    const expenseIds = await getExpenses(groupId)
    const { payments, splits } = await getSplits(expenseIds)
    const { hasInvalidExpense, invalidExpenses } = await hasInvalidExpenses(groupId)

    // if (hasInvalidExpense) return res.status(400).json({ error: "invalid or incomplete expenses", invalidExpenses: invalidExpenses })
    const usersInGroup = await getUsersInGroup(groupId)

    const normalisedPayments = await convertCurrency(payments, targetCurrency)
    const normalisedSplits = await convertCurrency(splits, targetCurrency)

    const { payerBillMap, owerBillMap } = populateMap(usersInGroup, normalisedPayments, normalisedSplits)
    const { receiverHeap, owerHeap } = populateHeap(usersInGroup, payerBillMap, owerBillMap)
    return computeLeastTransactions(receiverHeap, owerHeap)

}
