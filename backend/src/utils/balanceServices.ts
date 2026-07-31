import database from "../db"
import { logger } from "../logging/logger"
import type { BalanceData } from "../contracts/api"
import type { PoolClient } from "pg"
import { DataIntegrityError } from "./currencyServices"

interface ExpenseEntry {
    userId: string
    amount: string
}

interface BalanceExpense {
    expenseId: string
    sourceCurrency: string
    targetCurrency: string
    total: string
    rate: string
    payments: ExpenseEntry[]
    splits: ExpenseEntry[]
}

interface BalanceRepayment {
    payerUserId: string
    receiverUserId: string
    amount: string
    currency: string
}

export interface BalanceDataset {
    currency: string
    members: string[]
    expenses: BalanceExpense[]
    repayments: BalanceRepayment[]
}

interface DecimalRatio {
    numerator: bigint
    denominator: bigint
}

function integrity(message: string): never {
    throw new DataIntegrityError(message)
}

function parseMinorUnits(value: string): bigint {
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value)
    if (!match) integrity("Stored money is malformed")
    const fraction = (match[2] ?? "").padEnd(2, "0")
    return BigInt(match[1]) * 100n + BigInt(fraction || "0")
}

function parseRate(value: string): DecimalRatio {
    const match = /^(\d+)(?:\.(\d+))?$/.exec(value)
    if (!match) integrity("Stored FX rate is malformed")
    const fraction = match[2] ?? ""
    const denominator = 10n ** BigInt(fraction.length)
    const numerator = BigInt(`${match[1]}${fraction}`)
    if (numerator <= 0n) integrity("Stored FX rate is not positive")
    return { numerator, denominator }
}

function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
    const quotient = numerator / denominator
    const remainder = numerator % denominator
    return quotient + (remainder * 2n >= denominator ? 1n : 0n)
}

function formatMinorUnits(value: bigint): string {
    const sign = value < 0n ? "-" : ""
    const absolute = value < 0n ? -value : value
    return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`
}

function compareBigIntDescending(
    left: bigint,
    right: bigint
): number {
    return left === right ? 0 : left > right ? -1 : 1
}

function allocateConverted(
    entries: ExpenseEntry[],
    totalMinor: bigint,
    targetTotal: bigint,
    rate: DecimalRatio,
    members: Set<string>
): Map<string, bigint> {
    if (entries.length === 0) integrity("Expense entries are empty")

    const seen = new Set<string>()
    let sourceSum = 0n
    const allocation = entries.map(entry => {
        if (!members.has(entry.userId) || seen.has(entry.userId)) {
            integrity("Expense participant is invalid")
        }
        seen.add(entry.userId)
        const sourceAmount = parseMinorUnits(entry.amount)
        if (sourceAmount <= 0n) integrity("Expense amount is not positive")
        sourceSum += sourceAmount
        const product = sourceAmount * rate.numerator
        return {
            userId: entry.userId,
            allocated: product / rate.denominator,
            remainder: product % rate.denominator
        }
    })
    if (sourceSum !== totalMinor) {
        integrity("Expense entries do not sum to total")
    }

    const baseTotal = allocation.reduce(
        (sum, entry) => sum + entry.allocated,
        0n
    )
    const remainderUnits = targetTotal - baseTotal
    if (
        remainderUnits < 0n ||
        remainderUnits > BigInt(allocation.length)
    ) {
        integrity("Expense allocation cannot conserve converted total")
    }

    allocation.sort((left, right) => (
        compareBigIntDescending(left.remainder, right.remainder) ||
        left.userId.localeCompare(right.userId)
    ))
    for (let index = 0; index < Number(remainderUnits); index += 1) {
        allocation[index].allocated += 1n
    }

    return new Map(
        allocation.map(entry => [entry.userId, entry.allocated])
    )
}

function buildSettlements(
    balances: Map<string, bigint>
): BalanceData["settlements"] {
    const creditors = [...balances]
        .filter(([, amount]) => amount > 0n)
        .map(([userId, amount]) => ({ userId, amount }))
    const debtors = [...balances]
        .filter(([, amount]) => amount < 0n)
        .map(([userId, amount]) => ({ userId, amount: -amount }))
    const settlements: BalanceData["settlements"] = []

    const order = (
        left: { userId: string, amount: bigint },
        right: { userId: string, amount: bigint }
    ) => (
        compareBigIntDescending(left.amount, right.amount) ||
        left.userId.localeCompare(right.userId)
    )

    while (creditors.length > 0 || debtors.length > 0) {
        if (creditors.length === 0 || debtors.length === 0) {
            integrity("Member balances do not conserve the group total")
        }
        creditors.sort(order)
        debtors.sort(order)
        const creditor = creditors[0]
        const debtor = debtors[0]
        const amount = creditor.amount < debtor.amount
            ? creditor.amount
            : debtor.amount
        if (amount <= 0n) integrity("Settlement amount is not positive")

        settlements.push({
            payerUserId: debtor.userId,
            receiverUserId: creditor.userId,
            amount: formatMinorUnits(amount)
        })
        creditor.amount -= amount
        debtor.amount -= amount
        if (creditor.amount === 0n) creditors.shift()
        if (debtor.amount === 0n) debtors.shift()
    }
    return settlements
}

export function calculateDeterministicBalance(
    dataset: BalanceDataset
): BalanceData {
    if (!/^[A-Z]{3}$/.test(dataset.currency)) {
        integrity("Group currency is invalid")
    }
    const sortedMembers = [...dataset.members].sort((left, right) => (
        left.localeCompare(right)
    ))
    const memberSet = new Set(sortedMembers)
    if (memberSet.size !== sortedMembers.length) {
        integrity("Group members are duplicated")
    }
    const net = new Map(
        sortedMembers.map(userId => [userId, 0n])
    )

    for (const expense of dataset.expenses) {
        if (
            !expense.rate ||
            expense.targetCurrency !== dataset.currency ||
            !/^[A-Z]{3}$/.test(expense.sourceCurrency)
        ) {
            integrity(`Expense ${expense.expenseId} has invalid FX`)
        }
        const totalMinor = parseMinorUnits(expense.total)
        if (totalMinor <= 0n) integrity("Expense total is not positive")
        const rate = parseRate(expense.rate)
        if (
            expense.sourceCurrency === expense.targetCurrency &&
            rate.numerator !== rate.denominator
        ) {
            integrity("Identity FX rate is not one")
        }
        const targetTotal = roundHalfUp(
            totalMinor * rate.numerator,
            rate.denominator
        )
        const paid = allocateConverted(
            expense.payments,
            totalMinor,
            targetTotal,
            rate,
            memberSet
        )
        const owed = allocateConverted(
            expense.splits,
            totalMinor,
            targetTotal,
            rate,
            memberSet
        )
        for (const userId of sortedMembers) {
            net.set(
                userId,
                net.get(userId)! +
                (paid.get(userId) ?? 0n) -
                (owed.get(userId) ?? 0n)
            )
        }
    }

    for (const repayment of dataset.repayments) {
        if (
            repayment.currency !== dataset.currency ||
            repayment.payerUserId === repayment.receiverUserId ||
            !memberSet.has(repayment.payerUserId) ||
            !memberSet.has(repayment.receiverUserId)
        ) {
            integrity("Repayment data is invalid")
        }
        const amount = parseMinorUnits(repayment.amount)
        if (amount <= 0n) integrity("Repayment amount is not positive")
        net.set(
            repayment.payerUserId,
            net.get(repayment.payerUserId)! + amount
        )
        net.set(
            repayment.receiverUserId,
            net.get(repayment.receiverUserId)! - amount
        )
    }

    const groupTotal = [...net.values()].reduce(
        (sum, amount) => sum + amount,
        0n
    )
    if (groupTotal !== 0n) {
        integrity("Member balances do not conserve the group total")
    }

    return {
        currency: dataset.currency,
        balances: sortedMembers.map(userId => ({
            userId,
            amount: formatMinorUnits(net.get(userId)!)
        })),
        settlements: buildSettlements(net)
    }
}

export async function calculateBalanceWithClient(
    client: PoolClient,
    groupId: string
): Promise<BalanceData> {
    const group = await client.query<{ default_currency: string }>(
            `SELECT default_currency
             FROM groups
             WHERE id = $1`,
            [groupId]
    )
    if (!group.rows[0]) integrity("Group is missing")

    const members = await client.query<{ user_id: string }>(
            `SELECT user_id
             FROM group_members
             WHERE group_id = $1`,
            [groupId]
    )
    const expenses = await client.query<{
            expense_id: string
            source_currency: string
            target_currency: string | null
            total: string
            rate: string | null
        }>(
            `SELECT
                expense.id AS expense_id,
                expense.currency AS source_currency,
                snapshot.target_currency,
                expense.total::text,
                snapshot.rate::text
             FROM expenses AS expense
             LEFT JOIN expense_fx_snapshots AS snapshot
                ON snapshot.expense_id = expense.id
             WHERE expense.group_id = $1`,
            [groupId]
    )
    const payments = await client.query<{
            expense_id: string
            user_id: string
            amount: string
        }>(
            `SELECT expense_id, user_id, amount::text
             FROM payments
             WHERE group_id = $1`,
            [groupId]
    )
    const splits = await client.query<{
            expense_id: string
            user_id: string
            amount: string
        }>(
            `SELECT expense_id, user_id, amount::text
             FROM splits
             WHERE group_id = $1`,
            [groupId]
    )
    const repayments = await client.query<{
            payer_user_id: string
            receiver_user_id: string
            amount: string
            currency: string
        }>(
            `SELECT
                payer_user_id,
                receiver_user_id,
                amount::text,
                currency
             FROM repayments
             WHERE group_id = $1`,
            [groupId]
    )

    const dataset: BalanceDataset = {
        currency: group.rows[0].default_currency,
        members: members.rows.map(row => row.user_id),
        expenses: expenses.rows.map(row => ({
            expenseId: row.expense_id,
            sourceCurrency: row.source_currency,
            targetCurrency: row.target_currency ?? "",
            total: row.total,
            rate: row.rate ?? "",
            payments: payments.rows
                .filter(entry => entry.expense_id === row.expense_id)
                .map(entry => ({
                    userId: entry.user_id,
                    amount: entry.amount
                })),
            splits: splits.rows
                .filter(entry => entry.expense_id === row.expense_id)
                .map(entry => ({
                    userId: entry.user_id,
                    amount: entry.amount
                }))
        })),
        repayments: repayments.rows.map(row => ({
            payerUserId: row.payer_user_id,
            receiverUserId: row.receiver_user_id,
            amount: row.amount,
            currency: row.currency
        }))
    }
    return calculateDeterministicBalance(dataset)
}

export async function calculateBalance(groupId: string): Promise<BalanceData> {
    const client = await database.connect()
    try {
        await client.query(
            "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"
        )
        const result = await calculateBalanceWithClient(client, groupId)
        await client.query("COMMIT")
        return result
    } catch (error) {
        try {
            await client.query("ROLLBACK")
        } catch (rollbackError) {
            logger.error("balance_rollback_failed", {
                operation: "balance_transaction_rollback",
                groupId
            }, rollbackError)
        }
        throw error
    } finally {
        client.release()
    }
}
