import database from '../db'
import bcrypt from 'bcryptjs'

import { Request, Response } from 'express'

import { readAuthConfig } from '../config'
import {
    isSignupPasswordWithinByteLimit,
    isSignupTokenValid,
    parseCredentials,
    parseSignupCredentials
} from '../utils/authCredentials'
import generateToken, { clearSessionCookie } from "../utils/tokenGenerator"
import { hasAccount } from '../utils/validators'
import { getUser } from '../utils/queries'
import { sendFailure, sendSuccess } from '../contracts/http'
import { logger } from '../logging/logger'

export const signup = async (req: Request, res: Response) => {
    const credentials = parseSignupCredentials(req.body)
    if (!credentials) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            "Enter a valid username, password, and signup token"
        )
    }

    const { username, password, token } = credentials
    if (!isSignupPasswordWithinByteLimit(password)) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            "Password must be 72 UTF-8 bytes or fewer"
        )
    }

    const configuredSignupToken = process.env.SIGNUP_TOKEN?.trim()
    if (!configuredSignupToken) {
        logger.error("signup_disabled", { operation: "signup" })
        return sendFailure(
            res,
            503,
            "INTERNAL_ERROR",
            "Account creation is temporarily unavailable"
        )
    }
    if (!isSignupTokenValid(token, configuredSignupToken)) {
        return sendFailure(
            res,
            403,
            "FORBIDDEN",
            "Invalid signup token"
        )
    }

    try {
        if (await hasAccount(username)) {
            return sendFailure(
                res,
                409,
                "USERNAME_EXISTS",
                "Username is already taken"
            )
        }

        const { bcryptCost } = readAuthConfig()
        const hashedPassword = await bcrypt.hash(
            password,
            bcrypt.genSaltSync(bcryptCost)
        )
        await database.query(
            'INSERT INTO users (username, password) VALUES ($1, $2)',
            [username, hashedPassword]
        )
        return sendSuccess(res, 201, { message: "User created" })
    } catch (error) {
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "23505"
        ) {
            logger.warn("signup_username_conflict", { operation: "signup" }, error)
            return sendFailure(
                res,
                409,
                "USERNAME_EXISTS",
                "Username is already taken"
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
            "Invalid username or password"
        )
    }

    try {
        const { username, password } = credentials
        const user = await getUser(username)

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
                username: user.username
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
