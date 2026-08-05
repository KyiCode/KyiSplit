import type { Logger } from "../logging/logger"

interface DatabaseLike {
    query: (text: string) => Promise<unknown>
}

export function createDatabaseReadinessCheck({
    database,
    timeoutMs,
    logger
}: {
    database: DatabaseLike
    timeoutMs: number
    logger: Logger
}) {
    return async () => {
        try {
            await withTimeout(database.query("SELECT 1"), timeoutMs)
            return true
        } catch (error) {
            logger.warn("readiness_check_failed", {
                operation: "database_probe",
                timeoutMs
            }, error)
            return false
        }
    }
}

export async function withTimeout<T>(operation: Promise<T>, timeoutMs: number) {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            operation,
            new Promise<T>((_resolve, reject) => {
                timer = setTimeout(() => reject(new Error("Operation timed out")), timeoutMs)
            })
        ])
    } finally {
        if (timer) clearTimeout(timer)
    }
}
