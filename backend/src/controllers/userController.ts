import express from 'express'
import database from '../db'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

import { Request, Response } from 'express'

import generateToken from "../utils/tokenGenerator"

dotenv.config()



const router = express.Router()

const bcryptSalt = Number(process.env.BCRYPT_SALT)


export const signup = async (req: Request, res: Response) => {
    console.log("Signing up")
    try {
        const { name, email, password } = req.body

        const hasEmail = await database.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        )

        if (hasEmail.rows.length > 0) return res.json({ message: 'Email already has an account' })

        const hashedPassword = await bcrypt.hash(password, bcrypt.genSaltSync(bcryptSalt))
        await database.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
            [name, email, hashedPassword]
        )
        return res.json({ message: 'User created' })
    } catch (error) {
        return res.status(500).json({ error: 'Server error' })
    }
}

export const login = async (req: Request, res: Response) => {
    console.log("loggin in")
    try {
        const { email, password } = req.body

        const user = await database.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        )

        if (user.rows.length == 0) return res.json({ message: "Email not tagged to an account" })

        const authPassword = await bcrypt.compare(password, user.rows[0].password)

        if (!authPassword) return res.json({ message: "Wrong password" })
        const token = generateToken(user.rows[0].id, res)

        const userDetails = user.rows[0]

        return res.json({
            id: userDetails.id,
            name: userDetails.name,
            email: userDetails.email,
            token: token // not really necessary
        })

    } catch (error) {
        res.status(500).json({ error: 'Server error' })
    }
}
