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
        validateFlywayTarget(profile, environment)
    }
    return environment
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
    if (profile === 'prod' && !environment.FLYWAY_PASSWORD?.trim()) {
        throw new Error('FLYWAY_PASSWORD must be configured for production migrations')
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
    const executable = flywayCommand
        ? (process.platform === 'win32' ? 'flyway.cmd' : 'flyway')
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
