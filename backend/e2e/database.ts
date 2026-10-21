import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { Client } from 'pg'
import {
    assertSchemaCompatibility as verifySchemaCompatibility
} from '../src/db/schemaCompatibility'

type Environment = Record<string, string | undefined>

interface RunState {
    port: number
    runDirectory: string
}

export class E2EDatabaseStartupError extends Error {
    readonly stage: 'configuration' | 'prerequisite' | 'schema'
    readonly category:
        | 'invalid-settings'
        | 'missing-postgres-binary'
        | 'template-unavailable'
        | 'postgres-start-failed'
        | 'postgres-connect-failed'
        | 'schema-incompatible'

    constructor(
        stage: 'configuration' | 'prerequisite' | 'schema',
        category:
            | 'invalid-settings'
            | 'missing-postgres-binary'
            | 'template-unavailable'
            | 'postgres-start-failed'
            | 'postgres-connect-failed'
            | 'schema-incompatible'
    ) {
        super('E2E database startup failed')
        this.name = 'E2EDatabaseStartupError'
        this.stage = stage
        this.category = category
    }
}

export async function prepareRunPostgres(environment: Environment) {
    let config: ReturnType<typeof readPostgresConfig>
    try {
        config = readPostgresConfig(environment)
    } catch {
        throw new E2EDatabaseStartupError('configuration', 'invalid-settings')
    }
    try {
        await stopRunPostgres(environment)
    } catch {
        throw new E2EDatabaseStartupError('prerequisite', 'template-unavailable')
    }
    try {
        await validateTemplate(config)
    } catch (error) {
        if (error instanceof E2EDatabaseStartupError) throw error
        throw new E2EDatabaseStartupError('prerequisite', 'template-unavailable')
    }

    const runDirectory = path.join(
        config.runRoot,
        `run-${Date.now()}-${randomBytes(4).toString('hex')}`
    )
    try {
        await fs.mkdir(config.runRoot, { recursive: true })
        await fs.cp(config.templateDirectory, runDirectory, { recursive: true })
        await fs.writeFile(
            config.stateFile,
            JSON.stringify({ port: config.port, runDirectory } satisfies RunState),
            { encoding: 'utf8', flag: 'wx' }
        )
    } catch {
        throw new E2EDatabaseStartupError('prerequisite', 'template-unavailable')
    }

    try {
        const startResult = await runPgCtl(config.pgCtl, [
            '-D', runDirectory,
            '-l', path.join(runDirectory, 'postgres.log'),
            '-o', `-p ${config.port} -h 127.0.0.1`,
            '-w', 'start'
        ])
        if (startResult.code !== 0) {
            throw new E2EDatabaseStartupError(
                'prerequisite',
                'postgres-start-failed'
            )
        }
        const databaseUrl = databaseConnectionUrl(config)
        const client = new Client({ connectionString: databaseUrl })
        try {
            try {
                await client.connect()
            } catch {
                throw new E2EDatabaseStartupError(
                    'prerequisite',
                    'postgres-connect-failed'
                )
            }
            try {
                await assertSchemaCompatibility(client)
            } catch {
                throw new E2EDatabaseStartupError('schema', 'schema-incompatible')
            }
        } finally {
            if (client) await client.end().catch(() => undefined)
        }
        return databaseUrl
    } catch (error) {
        await stopRunPostgres(environment).catch(() => undefined)
        if (error instanceof E2EDatabaseStartupError) throw error
        if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'ENOENT'
        ) {
            throw new E2EDatabaseStartupError(
                'prerequisite',
                'missing-postgres-binary'
            )
        }
        throw new E2EDatabaseStartupError(
            'prerequisite',
            'postgres-start-failed'
        )
    }
}

export async function stopRunPostgres(environment: Environment) {
    const config = readPostgresConfig(environment)
    let state: RunState
    try {
        state = JSON.parse(await fs.readFile(config.stateFile, 'utf8')) as RunState
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
        throw error
    }
    assertSafeRunDirectory(config.runRoot, state.runDirectory)
    if (await exists(path.join(state.runDirectory, 'postmaster.pid'))) {
        const statusResult = await runPgCtl(config.pgCtl, [
            '-D', state.runDirectory, 'status'
        ])
        if (statusResult.code === 0) {
            const stopResult = await runPgCtl(config.pgCtl, [
                '-D', state.runDirectory,
                '-m', 'fast',
                '-w', 'stop'
            ])
            if (stopResult.code !== 0) {
                throw new Error(
                    `pg_ctl stop exited with code ${stopResult.code}: ${stopResult.output}`
                )
            }
        }
    }
    await fs.rm(state.runDirectory, { force: true, recursive: true })
    await fs.rm(config.stateFile, { force: true })
}

export async function assertSchemaCompatibility(client: Pick<Client, 'query'>) {
    await verifySchemaCompatibility(client)
}

export function readPostgresConfig(environment: Environment) {
    const binDirectory = path.resolve(required(environment, 'E2E_POSTGRES_BIN_DIR'))
    const templateDirectory = path.resolve(
        required(environment, 'E2E_POSTGRES_TEMPLATE_DIR')
    )
    const runRoot = path.resolve(required(environment, 'E2E_POSTGRES_RUN_ROOT'))
    const stateFile = path.resolve(required(environment, 'E2E_RUN_STATE_FILE'))
    const databaseName = required(environment, 'E2E_DATABASE_NAME')
    const databaseUser = required(environment, 'E2E_DATABASE_USER')
    const port = Number(required(environment, 'E2E_POSTGRES_PORT'))
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('E2E_POSTGRES_PORT must be an explicit valid port')
    }
    if (
        templateDirectory === runRoot ||
        templateDirectory.startsWith(`${runRoot}${path.sep}`)
    ) {
        throw new Error('E2E PostgreSQL template must be outside the disposable run root')
    }
    return {
        databaseName,
        databaseUser,
        pgCtl: path.join(
            binDirectory,
            process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl'
        ),
        port,
        runRoot,
        stateFile,
        templateDirectory
    }
}

async function validateTemplate(config: ReturnType<typeof readPostgresConfig>) {
    if (!await exists(config.pgCtl)) {
        throw new E2EDatabaseStartupError(
            'prerequisite',
            'missing-postgres-binary'
        )
    }
    const requiredPaths = [
        path.join(config.templateDirectory, '.kyisplit-e2e-template'),
        path.join(config.templateDirectory, 'PG_VERSION'),
        path.join(config.templateDirectory, 'base'),
        path.join(config.templateDirectory, 'global')
    ]
    for (const requiredPath of requiredPaths) {
        if (!await exists(requiredPath)) {
            throw new Error(`E2E PostgreSQL prerequisite is missing: ${requiredPath}`)
        }
    }
    if (await exists(path.join(config.templateDirectory, 'postmaster.pid'))) {
        throw new Error('E2E PostgreSQL template must be stopped before copying')
    }
}

function databaseConnectionUrl(config: ReturnType<typeof readPostgresConfig>) {
    return `postgresql://${encodeURIComponent(config.databaseUser)}@127.0.0.1:${config.port}/${encodeURIComponent(config.databaseName)}`
}

function assertSafeRunDirectory(runRoot: string, runDirectory: string) {
    const resolvedRoot = path.resolve(runRoot)
    const resolvedRun = path.resolve(runDirectory)
    if (
        path.dirname(resolvedRun) !== resolvedRoot ||
        !/^run-[0-9]+-[0-9a-f]{8}$/.test(path.basename(resolvedRun))
    ) {
        throw new Error('Refusing to remove an unrecognized E2E PostgreSQL directory')
    }
}

async function exists(target: string) {
    try {
        await fs.access(target)
        return true
    } catch {
        return false
    }
}

function runPgCtl(executable: string, arguments_: string[]) {
    return new Promise<{ code: number, output: string }>((resolve, reject) => {
        const child = spawn(executable, arguments_, {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
        })
        let output = ''
        child.stdout.on('data', chunk => { output += String(chunk) })
        child.stderr.on('data', chunk => { output += String(chunk) })
        child.once('error', reject)
        child.once('exit', code => {
            resolve({ code: code ?? 1, output: output.trim() })
        })
    })
}

function required(environment: Environment, name: string) {
    const value = environment[name]?.trim()
    if (!value) throw new Error(`${name} must be explicitly configured`)
    return value
}
