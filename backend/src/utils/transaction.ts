import type { PoolClient } from "pg"
import database from "../db"
import { logger } from "../logging/logger"

export async function runInTransaction<T>(
    operation: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await database.connect()

    try {
        await client.query("BEGIN")
        const result = await operation(client)
        await client.query("COMMIT")
        return result
    } catch (error) {
        try {
            await client.query("ROLLBACK")
        } catch (rollbackError) {
            logger.error("transaction_rollback_failed", {
                operation: "database_transaction_rollback"
            }, rollbackError)
        }
        throw error
    } finally {
        client.release()
    }
}
