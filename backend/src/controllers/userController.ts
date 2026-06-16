import express from 'express'
import database from '../db'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

import { Request, Response } from 'express'

import generateToken from "../utils/tokenGenerator"
import { hasAccount } from '../utils/validators'
import { getUser } from '../utils/queries'

dotenv.config()
const router = express.Router()
const bcryptSalt = Number(process.env.BCRYPT_SALT)

export const signup = async (req: Request, res: Response) => {
    console.log("Signing up")
    const { email, password } = req.body
    try {
        if (!email || !password) return res.json({ status: "fail", message: 'Invalid email or password' })
        if (await hasAccount(email)) return res.json({ status: "fail", message: 'Email already has an account' })

        const hashedPassword = await bcrypt.hash(password, bcrypt.genSaltSync(bcryptSalt))
        await database.query(
            'INSERT INTO users (email, password) VALUES ($1, $2)',
            [email, hashedPassword]
        )
        return res.status(200).json({ status: "success", message: 'User created' })
    } catch (error) {
        return res.status(500).json({ status: "fail", error: 'Server error' })
    }
}

export const login = async (req: Request, res: Response) => {
    console.log("loggin in")
    try {
        const { email, password } = req.body
        const user = await getUser(email)

        if (!(await hasAccount(email))) return res.json({ status: "fail", message: "Email not tagged to an account" })

        const authPassword = await bcrypt.compare(password, user.password)
        if (!authPassword) return res.json({ status: "fail", message: "Wrong password" })
        const token = generateToken(user.id, res)

        return res.status(200).json({
            status: "success",
            id: user.id,
            email: user.email,
            token: token
        })
    } catch (error) {
        res.status(500).json({ status: "fail", message: 'Server error' })
    }
}

export const verifySession = async (req: Request, res: Response) => {
    if (req.user.userId) {
        return res.json({ status: "success" });
    }

    return res.json({ status: "fail" });
};