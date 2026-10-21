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
    if (!['local', 'prod'].includes(profile) || !['dev', 'start'].includes(mode)) {
        throw new Error('Expected local or prod profile and dev or start mode')
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
    return environment
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
    const args = mode === 'dev'
        ? [require.resolve('tsx/cli'), 'watch', 'src/server.ts']
        : ['dist/server.js']
    const child = spawn(process.execPath, args, {
        cwd: process.cwd(),
        env: environment,
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
