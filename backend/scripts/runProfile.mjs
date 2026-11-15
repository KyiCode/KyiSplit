import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const scriptPath = fileURLToPath(import.meta.url)

export function buildProfileEnvironment(
    profile,
    mode,
    processEnvironment = process.env,
    directory = process.cwd()
) {
    if (
        !['local', 'prod'].includes(profile) ||
        !['dev', 'start', 'info', 'migrate', 'validate'].includes(mode)
    ) {
        throw new Error('Expected local or prod profile and a supported command')
    }
    const readEnv = file => {
        const envPath = path.join(directory, file)
        return fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {}
    }
    const environment = {
        ...readEnv('.env'),
        ...readEnv(`.env.${profile}`),
        ...processEnvironment
    }
    if (mode === 'dev' && !processEnvironment.NODE_ENV) {
        environment.NODE_ENV = 'development'
    }
    environment.DB_PROFILE = profile
    if (['info', 'migrate', 'validate'].includes(mode)) {
        configureFlywayEnvironment(profile, environment)
        validateFlywayTarget(profile, environment)
    }
    return environment
}

export function configureFlywayEnvironment(profile, environment) {
    const applicationUrl = profile === 'local'
        ? environment.LOCAL_DATABASE_URL?.trim()
        : (environment.SUPABASE_DATABASE_URL || environment.DATABASE_URL)?.trim()
    if (!applicationUrl) {
        throw new Error(profile === 'local'
            ? 'LOCAL_DATABASE_URL must be configured for local migrations'
            : 'SUPABASE_DATABASE_URL or DATABASE_URL must be configured for production migrations')
    }

    let parsedApplicationUrl
    try {
        parsedApplicationUrl = new URL(applicationUrl)
    } catch {
        throw new Error('Application database URL is invalid')
    }
    if (!['postgres:', 'postgresql:'].includes(parsedApplicationUrl.protocol)) {
        throw new Error('Application database URL must be PostgreSQL')
    }

    const explicitFlywayUrl = environment.FLYWAY_URL?.trim()
    if (
        profile === 'prod' &&
        !explicitFlywayUrl &&
        parsedApplicationUrl.hostname.includes('pooler.supabase.com') &&
        parsedApplicationUrl.port === '6543'
    ) {
        throw new Error('Set FLYWAY_URL to a direct or session-mode Supabase connection for migrations')
    }

    environment.FLYWAY_URL = explicitFlywayUrl || (
        `jdbc:postgresql://${parsedApplicationUrl.host}${parsedApplicationUrl.pathname}${parsedApplicationUrl.search}`
    )
    environment.FLYWAY_USER = environment.FLYWAY_USER?.trim() ||
        decodeURIComponent(parsedApplicationUrl.username)
    environment.FLYWAY_PASSWORD = environment.FLYWAY_PASSWORD ||
        decodeURIComponent(parsedApplicationUrl.password)
}

export function validateFlywayTarget(profile, environment) {
    const rawUrl = environment.FLYWAY_URL?.trim()
    if (!rawUrl?.startsWith('jdbc:postgresql://')) {
        throw new Error('FLYWAY_URL must be a JDBC PostgreSQL URL')
    }
    let url
    try {
        url = new URL(rawUrl.slice('jdbc:'.length))
    } catch {
        throw new Error('FLYWAY_URL must be a JDBC PostgreSQL URL')
    }
    if (
        url.protocol !== 'postgresql:' ||
        !url.hostname ||
        url.pathname.length <= 1 ||
        url.username ||
        url.password ||
        url.hash
    ) {
        throw new Error('FLYWAY_URL must be a credential-free JDBC PostgreSQL URL')
    }

    const hostname = url.hostname.toLowerCase()
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    if (profile === 'local' && !local) {
        throw new Error('Local Flyway commands require a loopback database target')
    }
    if (profile === 'prod' && (local || !hostname.includes('supabase'))) {
        throw new Error('Production Flyway commands require a hosted Supabase target')
    }
    if (profile === 'prod' && (
        !environment.FLYWAY_USER?.trim() ||
        !environment.FLYWAY_PASSWORD?.trim()
    )) {
        throw new Error('Production migration credentials must be configured')
    }
}

export function forwardShutdownSignals(child, signalSource = process) {
    for (const signal of ['SIGINT', 'SIGTERM']) {
        signalSource.once(signal, () => child.kill(signal))
    }
}

function main() {
    const [profile, mode] = process.argv.slice(2)
    const environment = buildProfileEnvironment(profile, mode)
    const require = createRequire(import.meta.url)
    const flywayCommand = ['info', 'migrate', 'validate'].includes(mode)
    const bundledFlyway = path.join(
        process.cwd(),
        'flyway',
        process.platform === 'win32' ? 'flyway.cmd' : 'flyway'
    )
    const executable = flywayCommand
        ? (fs.existsSync(bundledFlyway)
            ? bundledFlyway
            : (process.platform === 'win32' ? 'flyway.cmd' : 'flyway'))
        : process.execPath
    const args = flywayCommand
        ? ['-configFiles=flyway.conf', mode]
        : mode === 'dev'
            ? [require.resolve('tsx/cli'), 'watch', 'src/server.ts']
            : ['dist/server.js']
    const child = spawn(executable, args, {
        cwd: process.cwd(),
        env: environment,
        shell: flywayCommand && process.platform === 'win32',
        stdio: 'inherit',
        windowsHide: true
    })
    child.once('error', () => { process.exitCode = 1 })
    child.once('exit', code => { process.exitCode = code ?? 1 })
    forwardShutdownSignals(child)
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
    main()
}
