import path from 'node:path'
import { spawn } from 'node:child_process'
import type { Server } from 'node:http'
import { Client } from 'pg'
import { prepareRunPostgres, stopRunPostgres } from './database'
import { startFxServer } from './fxServer'

async function main() {
    const databaseUrl = await prepareRunPostgres(process.env)
    const fxPort = Number(process.env.E2E_FX_PORT)
    if (!Number.isInteger(fxPort) || fxPort < 1 || fxPort > 65535) {
        throw new Error('E2E_FX_PORT must be an explicit valid port')
    }
    const fxServer = await startFxServer(fxPort, {
        expireInvite: async token => {
            const client = new Client({ connectionString: databaseUrl })
            await client.connect()
            try {
                const result = await client.query(
                    `UPDATE invites
                     SET created_at = now() - interval '2 hours',
                         expires_at = now() - interval '1 hour'
                     WHERE token = $1`,
                    [token]
                )
                return result.rowCount === 1
            } finally {
                await client.end()
            }
        }
    })
    const backend = spawn(
        process.execPath,
        [path.resolve('../release/kyisplit/dist/server.js')],
        {
            env: {
                ...process.env,
                DATABASE_URL: databaseUrl,
                FRONTEND_ROOT: path.resolve('../release/kyisplit/public'),
                NODE_ENV: process.env.E2E_APP_NODE_ENV || process.env.NODE_ENV
            },
            stdio: 'inherit'
        }
    )

    let stopping = false
    async function stop(exitCode = 0) {
        if (stopping) return
        stopping = true
        backend.kill()
        await closeServer(fxServer)
        await stopRunPostgres(process.env)
        process.exitCode = exitCode
    }
    process.once('SIGINT', () => void stop())
    process.once('SIGTERM', () => void stop())
    backend.once('error', () => void stop(1))
    backend.once('exit', code => void stop(code ?? 1))
}

function closeServer(server: Server) {
    return new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
    })
}

void main().catch(error => {
    const message = error instanceof Error ? error.message : 'Unknown E2E startup failure'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
})
