import { Pool } from 'pg';
import dotenv from 'dotenv'

// pool auto connects for us, no need to implement connectDB

dotenv.config()

const database = new Pool({connectionString: process.env.DATABASE_URL})

export default database