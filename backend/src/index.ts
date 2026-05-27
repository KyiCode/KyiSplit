import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()   // loads .env file
console.log('DATABASE_URL:', process.env.DATABASE_URL)

const app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

// test database connection
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()')
        res.json(result.rows)
    } catch (error) {
        console.error('Database error:', error)  // prints in terminal
        res.status(500).json({ error: String(error) })  // shows in browser
    }
})

app.get('/api/groups', async (req, res) => {
    const result = await pool.query('SELECT * FROM groups')
    res.json(result.rows)
})

app.listen(3000, () => console.log('Server running on port 3000'))