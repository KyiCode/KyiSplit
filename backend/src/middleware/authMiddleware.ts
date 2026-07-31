import { NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import database from '../db'

import { Request, Response } from 'express'
import { readAuthConfig } from '../config'
import { sendFailure } from '../contracts/http'
import { logger } from '../logging/logger'

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.jwt

    if (!token) {
        sendFailure(
            res,
            401,
            "UNAUTHENTICATED",
            "Not authenticated"
        )
        return
    }

    interface TokenPayload {
        userId: string
    }

    let decoded: TokenPayload
    try {
        const { jwtKey } = readAuthConfig()
        decoded = jwt.verify(token, jwtKey) as TokenPayload
    } catch (error) {
        logger.warn("authentication_rejected", {
            operation: "verify_session_token"
        }, error)
        sendFailure(
            res,
            401,
            "UNAUTHENTICATED",
            "Not authenticated"
        )
        return
    }

    let hasUser
    try {
        hasUser = await database.query(
            'SELECT 1 FROM users WHERE id = $1',
            [decoded.userId]
        )
    } catch (error) {
        logger.error("authentication_lookup_failed", {
            operation: "verify_session_user"
        }, error)
        sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error"
        )
        return
    }

    if (hasUser.rows.length == 0) {
        sendFailure(
            res,
            401,
            "UNAUTHENTICATED",
            "Not authenticated"
        )
        return
    }

    req.user = { userId: decoded.userId }
    next()
}

export default authMiddleware
