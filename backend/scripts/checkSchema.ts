import { Client } from "pg"
import {
    assertSchemaCompatibility,
    parseExplicitDatabaseUrl
} from "../src/db/schemaCompatibility"

async function main() {
    let databaseUrl: string
    try {
        databaseUrl = parseExplicitDatabaseUrl(process.argv.slice(2))
    } catch (error) {
        process.stderr.write(`${safeMessage(error)}\n`)
        process.exitCode = 1
        return
    }

    const client = new Client({ connectionString: databaseUrl })
    try {
        await client.connect()
        await assertSchemaCompatibility(client)
        process.stdout.write("Schema compatibility check passed.\n")
    } catch (error) {
        const message = error instanceof Error && error.message.startsWith(
            "Database schema does not match roadmap/schema-reference.sql:"
        )
            ? error.message
            : "Schema compatibility check failed; verify the explicit database target and its access."
        process.stderr.write(`${message}\n`)
        process.exitCode = 1
    } finally {
        await client.end().catch(() => undefined)
    }
}

function safeMessage(error: unknown) {
    if (error instanceof Error && (
        error.message === "Pass an explicit --database-url target." ||
        error.message === "The explicit database target must be a PostgreSQL URL."
    )) {
        return error.message
    }
    return "Schema compatibility check requires an explicit PostgreSQL target."
}

void main()
