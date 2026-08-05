import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { Client } from 'pg'

type Environment = Record<string, string | undefined>

interface RunState {
    port: number
    runDirectory: string
}

const REQUIRED_COLUMNS: Record<string, string[]> = {
    expense_fx_snapshots: [
        'expense_id', 'group_id', 'source_currency', 'target_currency', 'rate'
    ],
    expenses: ['id', 'group_id', 'name', 'total', 'currency'],
    group_members: ['group_id', 'user_id', 'user_group_name'],
    groups: ['id', 'name', 'default_currency'],
    invites: ['id', 'group_id', 'token', 'expires_at'],
    payments: ['expense_id', 'user_id', 'amount', 'group_id'],
    repayments: [
        'id', 'group_id', 'payer_user_id', 'receiver_user_id', 'amount',
        'currency', 'repayment_date', 'recorded_by_user_id'
    ],
    splits: ['expense_id', 'user_id', 'amount', 'group_id'],
    users: ['id', 'email', 'password']
}

export async function prepareRunPostgres(environment: Environment) {
    const config = readPostgresConfig(environment)
    await stopRunPostgres(environment)
    await validateTemplate(config)

    const runDirectory = path.join(
        config.runRoot,
        `run-${Date.now()}-${randomBytes(4).toString('hex')}`
    )
    await fs.mkdir(config.runRoot, { recursive: true })
    await fs.cp(config.templateDirectory, runDirectory, { recursive: true })
    await fs.writeFile(
        config.stateFile,
        JSON.stringify({ port: config.port, runDirectory } satisfies RunState),
        { encoding: 'utf8', flag: 'wx' }
    )

    try {
        const startResult = await runPgCtl(config.pgCtl, [
            '-D', runDirectory,
            '-l', path.join(runDirectory, 'postgres.log'),
            '-o', `-p ${config.port} -h 127.0.0.1`,
            '-w', 'start'
        ])
        if (startResult.code !== 0) {
            throw new Error(
                `pg_ctl start exited with code ${startResult.code}: ${startResult.output}`
            )
        }
        const databaseUrl = databaseConnectionUrl(config)
        const client = new Client({ connectionString: databaseUrl })
        await client.connect()
        try {
            await assertSchemaCompatibility(client)
        } finally {
            await client.end()
        }
        return databaseUrl
    } catch (error) {
        await stopRunPostgres(environment)
        throw error
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
    const result = await client.query<{
        column_name: string
        table_name: string
    }>(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
    `)
    const actual = new Map<string, Set<string>>()
    for (const row of result.rows) {
        const columns = actual.get(row.table_name) || new Set<string>()
        columns.add(row.column_name)
        actual.set(row.table_name, columns)
    }
    const missing = Object.entries(REQUIRED_COLUMNS).flatMap(
        ([table, columns]) => columns
            .filter(column => !actual.get(table)?.has(column))
            .map(column => `${table}.${column}`)
    )
    if (missing.length > 0) {
        throw new Error(
            `E2E database does not match roadmap/schema-reference.sql; missing: ${missing.join(', ')}`
        )
    }
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
    const requiredPaths = [
        config.pgCtl,
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
