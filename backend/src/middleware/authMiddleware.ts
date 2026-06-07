import express, { NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import database from '../db'
import dotenv from 'dotenv'

import { Request, Response } from 'express'
import { json } from 'node:stream/consumers'

dotenv.config()

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    console.log("In middleware")

    let token
    const auth = req.headers.authorization

    // set tokenn if have
    if (auth && auth.startsWith("Bearer")) {
        token = auth.split(" ")[1]
    } else if (req.cookies?.jwt) {
        token = req.cookies.jwt
    }

    // if not token not authorised
    if (!token) {
        res.status(401).json({ message: "not authorised" })
        return
    }
    // verify token with kwt.verif

    interface tokenPayLoad {
        userId: string
    }

    let decoded
    try {
        decoded = jwt.verify(token, process.env.JWT_KEY!) as tokenPayLoad
    } catch (error) {
        res.status(401).json({ error: "Invalid token" })
        return
    }

    const hasUser = await database.query(
        'SELECT * FROM users WHERE id = $1',
        [decoded.userId]
    )

    if (hasUser.rows.length == 0) {
        res.status(401).json({ error: 'User not found' })
        return
    }

    req.user = { userId: decoded.userId }
    next()
}

export default authMiddleware