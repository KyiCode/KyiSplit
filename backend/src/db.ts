import { Pool } from 'pg';
import dotenv from 'dotenv'
import { readDatabaseConfig } from './config'

// pool auto connects for us, no need to implement connectDB

dotenv.config({ quiet: true })

const databaseConfig = readDatabaseConfig()
const database = new Pool({
    connectionString: databaseConfig.connectionString,
    max: databaseConfig.max,
    idleTimeoutMillis: databaseConfig.idleTimeoutMs,
    connectionTimeoutMillis: databaseConfig.connectionTimeoutMs
})

export default database
