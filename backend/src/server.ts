import express from 'express';
import cors from 'cors'
import database from './db';
import dotenv from 'dotenv'

import userRoutes from './routes/userRoutes'
import groupRoutes from './routes/groupRoutes'
import expenseRoutes from './routes/expenseRoutes'

dotenv.config()

const app = express()
const port = 5001
app.use(cors())
app.use(express.json())


app.use('/api/users', userRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/expenses', expenseRoutes)


const server = app.listen(port, () => console.log("server connected"))

const dbConnCheck = async () => {
    try {
        await database.query("SELECT 1")
        console.log("db connected")
    } catch (error) {
        console.log("db connection failure", { error: Error })
    }
}

dbConnCheck()

