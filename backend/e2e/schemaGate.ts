import path from 'node:path'
import { Client } from 'pg'
import {
    assertSchemaCompatibility,
    prepareRunPostgres,
    stopRunPostgres
} from './database'

async function main() {
    process.loadEnvFile(path.resolve('../frontend/.env.e2e.local'))
    Object.assign(process.env, {
        E2E_DATABASE_NAME: 'kyisplit_e2e_template',
        E2E_DATABASE_USER: 'kyisplit_e2e',
        E2E_POSTGRES_PORT: '55432',
        E2E_POSTGRES_RUN_ROOT: path.resolve('../frontend/test-results/postgres'),
        E2E_RUN_STATE_FILE: path.resolve('../frontend/test-results/e2e-database.json')
    })

    const databaseUrl = await prepareRunPostgres(process.env)
    const client = new Client({ connectionString: databaseUrl })
    try {
        await client.connect()
        await assertSchemaCompatibility(client)
        process.stdout.write('Explicit disposable schema gate passed.\n')
    } finally {
        await client.end().catch(() => undefined)
        await stopRunPostgres(process.env)
    }
}

void main().catch(() => {
    process.stderr.write('Explicit disposable schema gate failed.\n')
    process.exitCode = 1
})
