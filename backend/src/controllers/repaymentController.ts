import type { Request, Response } from "express"

import database from "../db"
import { sendFailure, sendSuccess } from "../contracts/http"
import {
    serializeDate,
    serializeMoney,
    serializeTimestamp
} from "../contracts/serialization"
import { getGroupDetails } from "../utils/queries"
import {
    isUuid,
    parseRepaymentInput
} from "../utils/repaymentValidation"
import { isUserAuthorised } from "../utils/validators"
import { logger } from "../logging/logger"

interface RepaymentRow {
    id: string
    group_id: string
    payer_user_id: string
    receiver_user_id: string
    amount: unknown
    currency: string
    repayment_date: unknown
    recorded_by_user_id: string
    created_at: unknown
}

function mapRepayment(row: RepaymentRow) {
    return {
        repaymentId: row.id,
        groupId: row.group_id,
        payerUserId: row.payer_user_id,
        receiverUserId: row.receiver_user_id,
        amount: serializeMoney(row.amount),
        currency: row.currency,
        repaymentDate: serializeDate(row.repayment_date),
        recordedByUserId: row.recorded_by_user_id,
        createdAt: serializeTimestamp(row.created_at)
    }
}

export async function createRepayment(req: Request, res: Response) {
    const parsed = parseRepaymentInput(req.body)
    if (!parsed) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            "Invalid repayment"
        )
    }

    const groupId = req.params.groupId as string
    const recordedByUserId = req.user.userId
    try {
        if (!await isUserAuthorised(recordedByUserId, groupId)) {
            return sendFailure(res, 403, "FORBIDDEN", "Forbidden")
        }
        if (
            !await isUserAuthorised(parsed.payerUserId, groupId) ||
            !await isUserAuthorised(parsed.receiverUserId, groupId)
        ) {
            return sendFailure(
                res,
                400,
                "VALIDATION_ERROR",
                "Repayment participants must be current group members"
            )
        }

        const group = await getGroupDetails(groupId)
        const result = await database.query<RepaymentRow>(
            `INSERT INTO repayments
                (
                    group_id,
                    payer_user_id,
                    receiver_user_id,
                    amount,
                    currency,
                    repayment_date,
                    recorded_by_user_id
                )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                groupId,
                parsed.payerUserId,
                parsed.receiverUserId,
                parsed.amount,
                group.defaultCurrency,
                parsed.repaymentDate,
                recordedByUserId
            ]
        )
        return sendSuccess(res, 201, {
            repayment: mapRepayment(result.rows[0])
        })
    } catch (error) {
        logger.error("repayment_creation_failed", {
            operation: "create_repayment",
            groupId
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error creating repayment"
        )
    }
}

export async function listRepayments(req: Request, res: Response) {
    const groupId = req.params.groupId as string
    const userId = req.user.userId
    try {
        if (!await isUserAuthorised(userId, groupId)) {
            return sendFailure(res, 403, "FORBIDDEN", "Forbidden")
        }

        const result = await database.query<RepaymentRow>(
            `SELECT *
             FROM repayments
             WHERE group_id = $1
             ORDER BY repayment_date DESC, created_at DESC, id DESC`,
            [groupId]
        )
        return sendSuccess(res, 200, {
            repayments: result.rows.map(mapRepayment)
        })
    } catch (error) {
        logger.error("repayment_list_failed", {
            operation: "list_repayments",
            groupId
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error listing repayments"
        )
    }
}

export async function deleteRepayment(req: Request, res: Response) {
    const groupId = req.params.groupId as string
    const repaymentId = req.params.repaymentId as string
    const userId = req.user.userId
    try {
        if (!await isUserAuthorised(userId, groupId)) {
            return sendFailure(res, 403, "FORBIDDEN", "Forbidden")
        }
        if (!isUuid(repaymentId)) {
            return sendFailure(
                res,
                400,
                "VALIDATION_ERROR",
                "Invalid repayment"
            )
        }

        const result = await database.query<{ id: string }>(
            `DELETE FROM repayments
             WHERE id = $1 AND group_id = $2
             RETURNING id`,
            [repaymentId, groupId]
        )
        if (!result.rows[0]) {
            return sendFailure(
                res,
                404,
                "NOT_FOUND",
                "Repayment not found"
            )
        }
        return sendSuccess(res, 200, {
            repaymentId: result.rows[0].id
        })
    } catch (error) {
        logger.error("repayment_deletion_failed", {
            operation: "delete_repayment",
            groupId,
            repaymentId
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error deleting repayment"
        )
    }
}
