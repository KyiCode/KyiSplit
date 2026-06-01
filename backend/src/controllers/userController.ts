import express from 'express'
import database from '../db'
import { PassThrough } from 'node:stream'
import bcrypt from 'bcryptjs'
import { error } from 'node:console'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

const bcryptSalt = Number(process.env.BCRYPT_SALT)


const signup = router.post('/signup', async (req, res) => {

    try {
        console.log("Signing up")
        const { name, email, password } = req.body
        const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(bcryptSalt))
        await database.query(

            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
            [name, email, hashedPassword]
        )
        res.json({ message: 'user created' })
    } catch (error) {
        res.status(500).send((error as Error).message)
    }
})

const login = router.get('/login', async (req, res) => {
    try {
        console.log("loggin in")
        const { email, password } = req.body

        const user = await database.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        )

        if (!user) return res.json({ message: "Email not tagged to an account" })

        const authPassword = await bcrypt.compare(password, user.rows[0].password)

        if (!authPassword) return res.json({ message: "Wrong password" })

        return res.json(user.rows)
    } catch (error) {
        res.status(500).send((error as Error).message)
    }
})

export default router