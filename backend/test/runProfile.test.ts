import fs from "node:fs/promises"
import { EventEmitter } from "node:events"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { spawn } from "node:child_process"
import { afterEach, describe, expect, it } from "vitest"

const backendDirectory = path.resolve(__dirname, "..")
const profileRunner = path.join(backendDirectory, "scripts", "runProfile.mjs")
const temporaryDirectories: string[] = []

afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(directory => (
        fs.rm(directory, { recursive: true, force: true })
    )))
})

describe("profile command runner", () => {
    it("forwards shutdown signals to the server process", async () => {
        const { forwardShutdownSignals } = await import(
            pathToFileURL(profileRunner).href
        ) as {
            forwardShutdownSignals: (
                child: { kill: (signal: NodeJS.Signals) => boolean },
                signalSource: EventEmitter
            ) => void
        }
        const signalSource = new EventEmitter()
        const forwarded: NodeJS.Signals[] = []

        forwardShutdownSignals({
            kill: signal => {
                forwarded.push(signal)
                return true
            }
        }, signalSource)
        signalSource.emit("SIGINT")
        signalSource.emit("SIGTERM")

        expect(forwarded).toEqual(["SIGINT", "SIGTERM"])
    })

    it("keeps prod database selection while defaulting its dev command to development mode", async () => {
        const directory = await createTemporaryDirectory()
        await fs.writeFile(path.join(directory, ".env.prod"), [
            "NODE_ENV=production",
            "SUPABASE_DATABASE_URL=postgresql://user:secret@supabase.example/app"
        ].join("\n"))
        const { buildProfileEnvironment } = await import(
            pathToFileURL(profileRunner).href
        ) as {
            buildProfileEnvironment: (
                profile: "prod",
                mode: "dev",
                environment: NodeJS.ProcessEnv,
                directory: string
            ) => NodeJS.ProcessEnv
        }

        const environment = buildProfileEnvironment(
            "prod",
            "dev",
            {},
            directory
        )

        expect(environment).toMatchObject({
            DB_PROFILE: "prod",
            NODE_ENV: "development",
            SUPABASE_DATABASE_URL: "postgresql://user:secret@supabase.example/app"
        })
    })

    it("allows an explicit runtime mode override", async () => {
        const directory = await createTemporaryDirectory()
        await fs.writeFile(path.join(directory, ".env.prod"), "NODE_ENV=production\n")
        const { buildProfileEnvironment } = await import(
            pathToFileURL(profileRunner).href
        ) as {
            buildProfileEnvironment: (
                profile: "prod",
                mode: "dev",
                environment: NodeJS.ProcessEnv,
                directory: string
            ) => NodeJS.ProcessEnv
        }

        expect(buildProfileEnvironment("prod", "dev", {
            NODE_ENV: "test"
        }, directory).NODE_ENV).toBe("test")
    })

    it("loads base, profile, and runtime settings in precedence order", async () => {
        const directory = await createTemporaryDirectory()
        await fs.writeFile(path.join(directory, ".env"), [
            "DATABASE_URL=postgresql://base.example/app",
            "FRONTEND_URL=http://base.example"
        ].join("\n"))
        await fs.writeFile(path.join(directory, ".env.local"), [
            "LOCAL_DATABASE_URL=postgresql://local@127.0.0.1/app",
            "DATABASE_URL=postgresql://profile.example/app",
            "FRONTEND_URL=http://profile.example"
        ].join("\n"))

        const result = await runProfile(directory, "local", {
            DATABASE_URL: "postgresql://runtime.example/app",
            FRONTEND_URL: "http://runtime.example",
            JWT_KEY: "runtime-secret"
        })

        expect(result.code, result.stderr).toBe(0)
        expect(result.stdout.trim()).toBe(
            "PROFILE=local|LOCAL=127.0.0.1|SUPABASE=|LOCAL_PRESENT=true|FRONTEND=runtime.example|JWT_PRESENT=true"
        )
        expect(result.stdout).not.toContain("runtime-secret")
        expect(result.stdout).not.toContain("postgresql://")
    })

    it("selects the prod profile and never prints database credentials", async () => {
        const directory = await createTemporaryDirectory()
        await fs.writeFile(path.join(directory, ".env.prod"), [
            "SUPABASE_DATABASE_URL=postgresql://user:secret@supabase.example/app",
            "LOCAL_DATABASE_URL=postgresql://local@127.0.0.1/app",
            "FRONTEND_URL=https://app.example"
        ].join("\n"))

        const result = await runProfile(directory, "prod")

        expect(result.code, result.stderr).toBe(0)
        expect(result.stdout.trim()).toBe(
            "PROFILE=prod|LOCAL=127.0.0.1|SUPABASE=supabase.example|LOCAL_PRESENT=true|FRONTEND=app.example|JWT_PRESENT=false"
        )
        expect(result.stdout).not.toContain("secret")
        expect(result.stdout).not.toContain("postgresql://")
    })

    it("propagates a server startup failure", async () => {
        const directory = await createTemporaryDirectory()
        await fs.writeFile(
            path.join(directory, "dist", "server.js"),
            "process.stderr.write('EXPECTED_START_FAILURE'); process.exit(23)"
        )

        const result = await runProfile(directory, "local", {})

        expect(result.code).toBe(23)
        expect(result.stderr).toContain("EXPECTED_START_FAILURE")
    })
})

async function createTemporaryDirectory() {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "kyisplit-profile-"))
    temporaryDirectories.push(directory)
    await fs.mkdir(path.join(directory, "dist"))
    await fs.writeFile(path.join(directory, "dist", "server.js"), [
        "const local = process.env.LOCAL_DATABASE_URL",
        "const supabase = process.env.SUPABASE_DATABASE_URL",
        "const localHost = local ? new URL(local).hostname : ''",
        "const supabaseHost = supabase ? new URL(supabase).hostname : ''",
        "console.log(['PROFILE=' + process.env.DB_PROFILE,",
        "  'LOCAL=' + localHost, 'SUPABASE=' + supabaseHost,",
        "  'LOCAL_PRESENT=' + Boolean(local),",
        "  'FRONTEND=' + new URL(process.env.FRONTEND_URL).hostname,",
        "  'JWT_PRESENT=' + Boolean(process.env.JWT_KEY)].join('|'))"
    ].join("\n"))
    return directory
}

function runProfile(
    directory: string,
    profile: "local" | "prod",
    environment: NodeJS.ProcessEnv = {}
) {
    return new Promise<{ code: number | null, stdout: string, stderr: string }>(
        (resolve, reject) => {
            const processEnvironment: NodeJS.ProcessEnv = {}
            for (const key of ["PATH", "Path", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"]) {
                if (process.env[key]) processEnvironment[key] = process.env[key]
            }
            const child = spawn(
                process.execPath,
                [profileRunner, profile, "start"],
                {
                    cwd: directory,
                    env: { ...processEnvironment, ...environment },
                    windowsHide: true
                }
            )
            let stdout = ""
            let stderr = ""
            child.stdout.on("data", chunk => { stdout += String(chunk) })
            child.stderr.on("data", chunk => { stderr += String(chunk) })
            child.once("error", reject)
            child.once("exit", code => resolve({ code, stdout, stderr }))
        }
    )
}
