import { Request, Response } from "express"

import { isUserAuthorised } from "../utils/validators"
import { calculateBalance } from "../utils/balanceServices";
import { sendFailure, sendSuccess } from "../contracts/http"
import { DataIntegrityError } from "../utils/currencyServices"
import { logger } from "../logging/logger"

export const getBalance = async (req: Request, res: Response) => {
    const user = req.user.userId
    const groupId = req.params.groupId as string
    if (!user || !groupId) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            "Bad request"
        )
    }

    try {
        if (!(await isUserAuthorised(user, groupId))) {
            return sendFailure(
                res,
                403,
                "FORBIDDEN",
                "Forbidden"
            )
        }

        const balance = await calculateBalance(groupId)
        return sendSuccess(res, 200, balance)
    } catch (error) {
        if (error instanceof DataIntegrityError) {
            logger.error("balance_data_integrity_failed", {
                operation: "get_balance",
                groupId
            }, error)
            return sendFailure(
                res,
                500,
                "DATA_INTEGRITY_ERROR",
                "Stored balance data is incomplete"
            )
        }
        logger.error("balance_calculation_failed", {
            operation: "get_balance",
            groupId
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error calculating balance"
        )
    }
}

