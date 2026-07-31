import { Request, Response } from 'express'

import database from '../db'
import type { DeleteExpenseData } from '../contracts/api'
import { isUserAuthorised } from '../utils/validators'
import { getExpenses } from '../utils/queries'
import { getGroupDetails } from '../utils/queries'
import { runInTransaction } from '../utils/transaction'
import { parseExpenseInput } from '../utils/expenseValidation'
import { sendFailure, sendSuccess } from '../contracts/http'
import {
    serializeDate,
    serializeMoney,
    serializeTimestamp
} from '../contracts/serialization'
import {
    FxUnavailableError,
    getFxQuote
} from '../utils/currencyServices'
import { isUuid } from '../utils/repaymentValidation'
import { logger } from '../logging/logger'

export const addExpense = async (req: Request, res: Response) => {
    const user = req.user.userId
    const parsedExpense = parseExpenseInput(req.body)
    if (!parsedExpense.ok) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            parsedExpense.message
        )
    }

    const {
        groupId,
        expenseName,
        expenseTotal,
        expenseDate,
        expenseCurrency,
        paidBy,
        splits
    } = parsedExpense.value

    try {
        if (!(await isUserAuthorised(user, groupId))) {
            return sendFailure(
                res,
                403,
                "FORBIDDEN",
                "User not in group or No such group"
            )
        }

        const participantIds = new Set([
            ...paidBy.map(entry => entry.userId),
            ...splits.map(entry => entry.userId)
        ])
        for (const participantId of participantIds) {
            if (!(await isUserAuthorised(participantId, groupId))) {
                return sendFailure(
                    res,
                    400,
                    "VALIDATION_ERROR",
                    "Expense participant is not a group member"
                )
            }
        }

        const group = await getGroupDetails(groupId)
        const fxQuote = await getFxQuote(
            expenseCurrency,
            group.defaultCurrency
        )

        const expenseId = await runInTransaction(async client => {
            const result = await client.query(
                'INSERT INTO expenses (group_id, name, total, date, currency) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [
                    groupId,
                    expenseName,
                    expenseTotal,
                    expenseDate,
                    expenseCurrency
                ]
            )

            const expenseId = result.rows[0].id

            await client.query(
                `INSERT INTO expense_fx_snapshots
                    (
                        expense_id,
                        group_id,
                        source_currency,
                        target_currency,
                        rate,
                        provider,
                        provider_effective_at,
                        captured_at
                    )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
                [
                    expenseId,
                    groupId,
                    expenseCurrency,
                    group.defaultCurrency,
                    fxQuote.rate,
                    fxQuote.provider,
                    fxQuote.effectiveAt
                ]
            )

            for (const payer of paidBy) {
                const payerUserId = payer.userId
                const payerAmount = payer.amount
                if (payerAmount === 0) continue

                await client.query(
                    `INSERT INTO payments
                        (expense_id, group_id, user_id, amount)
                     VALUES ($1, $2, $3, $4)
                    ON CONFLICT (expense_id, user_id)
                    DO UPDATE SET amount = EXCLUDED.amount`,
                    [expenseId, groupId, payerUserId, payerAmount]
                )
            }

            for (const assignee of splits) {
                const assigneeUserId = assignee.userId
                const assigneeAmount = assignee.amount
                if (assigneeAmount === 0) continue

                await client.query(
                    `INSERT INTO splits
                        (expense_id, group_id, user_id, amount)
                     VALUES ($1, $2, $3, $4)
                    ON CONFLICT (expense_id, user_id)
                    DO UPDATE SET amount = EXCLUDED.amount`,
                    [expenseId, groupId, assigneeUserId, assigneeAmount]
                )
            }
            return expenseId as string
        })

        return sendSuccess(res, 201, { expenseId })
    } catch (error) {
        if (error instanceof FxUnavailableError) {
            logger.warn("expense_fx_unavailable", {
                operation: "add_expense",
                groupId
            }, error)
            return sendFailure(
                res,
                503,
                "FX_UNAVAILABLE",
                "Exchange rate is unavailable"
            )
        }
        logger.error("expense_creation_failed", {
            operation: "add_expense",
            groupId
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error adding expense"
        )
    }
}

export const getExpenseList = async (req: Request, res: Response) => {
    const user = req.user.userId
    const groupId = req.params.groupId as string
    try {
        if (!groupId) {
            return sendFailure(
                res,
                400,
                "VALIDATION_ERROR",
                "Invalid group"
            )
        }
        if (!(await isUserAuthorised(user, groupId))) {
            return sendFailure(
                res,
                403,
                "FORBIDDEN",
                "Forbidden"
            )
        }

        const expenses = await getExpenses(groupId)
        const mappedExpenses = expenses.map(e => ({
            expenseId: e.id,
            groupId: e.group_id,
            expenseName: e.name,
            expenseTotal: serializeMoney(e.total),
            date: serializeDate(e.date),
            createdAt: serializeTimestamp(e.created_at),
            currency: e.currency
        }))
        return sendSuccess(res, 200, { expenses: mappedExpenses })
    } catch (error) {
        logger.error("expense_list_failed", {
            operation: "list_expenses",
            groupId
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error getting expenses"
        )
    }
}

export const deleteExpense = async (req: Request, res: Response) => {
    const groupId = req.params.groupId as string
    const expenseId = req.params.expenseId as string
    const userId = req.user.userId

    if (!isUuid(groupId) || !isUuid(expenseId)) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            "Invalid expense"
        )
    }

    try {
        if (!(await isUserAuthorised(userId, groupId))) {
            return sendFailure(res, 403, "FORBIDDEN", "Forbidden")
        }

        const result = await database.query<{ id: string }>(
            `DELETE FROM expenses
             WHERE id = $1 AND group_id = $2
             RETURNING id`,
            [expenseId, groupId]
        )
        if (!result.rows[0]) {
            return sendFailure(
                res,
                404,
                "NOT_FOUND",
                "Expense not found"
            )
        }

        const data: DeleteExpenseData = {
            expenseId: result.rows[0].id
        }
        return sendSuccess(res, 200, data)
    } catch (error) {
        logger.error("expense_deletion_failed", {
            operation: "delete_expense",
            groupId,
            expenseId
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error deleting expense"
        )
    }
}
