import database from '../db'
import bcrypt from 'bcryptjs'

import { Request, Response } from 'express'

import { readAuthConfig } from '../config'
import { parseCredentials } from '../utils/authCredentials'
import generateToken, { clearSessionCookie } from "../utils/tokenGenerator"
import { hasAccount } from '../utils/validators'
import { getUser } from '../utils/queries'
import { sendFailure, sendSuccess } from '../contracts/http'
import { logger } from '../logging/logger'

export const signup = async (req: Request, res: Response) => {
    const credentials = parseCredentials(req.body)
    if (!credentials) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            "Invalid email or password"
        )
    }

    const { email, password } = credentials
    try {
        if (await hasAccount(email)) {
            return sendFailure(
                res,
                409,
                "EMAIL_EXISTS",
                "Email already has an account"
            )
        }

        const { bcryptCost } = readAuthConfig()
        const hashedPassword = await bcrypt.hash(
            password,
            bcrypt.genSaltSync(bcryptCost)
        )
        await database.query(
            'INSERT INTO users (email, password) VALUES ($1, $2)',
            [email, hashedPassword]
        )
        return sendSuccess(res, 201, { message: "User created" })
    } catch (error) {
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "23505"
        ) {
            logger.warn("signup_email_conflict", { operation: "signup" }, error)
            return sendFailure(
                res,
                409,
                "EMAIL_EXISTS",
                "Email already has an account"
            )
        }
        logger.error("signup_failed", { operation: "signup" }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error"
        )
    }
}

export const login = async (req: Request, res: Response) => {
    const credentials = parseCredentials(req.body)
    if (!credentials) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            "Invalid email or password"
        )
    }

    try {
        const { email, password } = credentials
        const user = await getUser(email)

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return sendFailure(
                res,
                401,
                "UNAUTHENTICATED",
                "Invalid credentials"
            )
        }

        generateToken(user.id, res)
        return sendSuccess(res, 200, {
            user: {
                userId: user.id,
                email: user.email
            }
        })
    } catch (error) {
        logger.error("login_failed", { operation: "login" }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error"
        )
    }
}

export const verifySession = async (req: Request, res: Response) => {
    return sendSuccess(res, 200, {
        userId: req.user.userId
    })
}

export const logout = async (_req: Request, res: Response) => {
    clearSessionCookie(res)
    return sendSuccess(res, 200, {})
}
