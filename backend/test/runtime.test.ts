import http, { type Server } from "node:http"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createApp } from "../src/app"
import { createDatabaseReadinessCheck } from "../src/runtime/health"
import { createServerRuntime } from "../src/runtime/serverRuntime"

const servers: Server[] = []

afterEach(async () => {
    await Promise.all(servers.splice(0).map(server => (
        new Promise<void>((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve())
        })
    )))
})

describe("runtime health endpoints", () => {
    it("reports liveness without consulting dependencies", async () => {
        const readiness = vi.fn(async () => {
            throw new Error("database should not be queried")
        })
        const origin = await start(createApp({ readiness }))

        const response = await fetch(`${origin}/health/live`)

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ status: "ok" })
        expect(readiness).not.toHaveBeenCalled()
    })

    it("reports readiness and hides dependency failure details", async () => {
        const readiness = vi.fn(async () => {
            throw new Error("postgres password=super-secret")
        })
        const origin = await start(createApp({ readiness }))

        const response = await fetch(`${origin}/health/ready`)

        expect(response.status).toBe(503)
        expect(await response.json()).toEqual({
            status: "fail",
            message: "Not ready"
        })
        expect(readiness).toHaveBeenCalledOnce()
    })

    it("bounds a slow database readiness probe", async () => {
        const logger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn()
        }
        const readiness = createDatabaseReadinessCheck({
            database: {
                query: () => new Promise(() => undefined)
            },
            timeoutMs: 5,
            logger
        })

        await expect(readiness()).resolves.toBe(false)
        expect(logger.warn).toHaveBeenCalledWith(
            "readiness_check_failed",
            expect.objectContaining({ operation: "database_probe" }),
            expect.any(Error)
        )
    })
})

describe("authentication abuse controls", () => {
    it("limits attempts per client identity at the trusted proxy boundary", async () => {
        const origin = await start(createApp({
            trustProxyHops: 1,
            abuseControl: { maxAttempts: 2, windowMs: 60_000 }
        }))

        const request = (forwardedFor: string) => fetch(`${origin}/api/users/login`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-forwarded-for": forwardedFor
            },
            body: JSON.stringify({ email: "bad", password: "bad" })
        })

        expect((await request("203.0.113.10")).status).toBe(400)
        expect((await request("203.0.113.10")).status).toBe(400)
        expect((await request("203.0.113.10")).status).toBe(429)
        expect((await request("203.0.113.11")).status).toBe(400)
    })
})

describe("server runtime lifecycle", () => {
    it("waits for the database before listening and closes resources once", async () => {
        const query = vi.fn(async () => ({ rows: [] }))
        const end = vi.fn(async () => undefined)
        const close = vi.fn((callback: (error?: Error) => void) => callback())
        const listen = vi.fn(() => ({ close }))
        const logger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn()
        }
        const runtime = createServerRuntime({
            app: { listen },
            database: { query, end },
            logger,
            port: 5511,
            readinessTimeoutMs: 100
        })

        await runtime.start()
        await Promise.all([runtime.shutdown(0), runtime.shutdown(0)])

        expect(query).toHaveBeenCalledWith("SELECT 1")
        expect(listen).toHaveBeenCalledWith(5511)
        expect(close).toHaveBeenCalledOnce()
        expect(end).toHaveBeenCalledOnce()
        expect(logger.info).toHaveBeenCalledWith("shutdown_completed", { exitCode: 0 })
        expect(process.exitCode).toBe(0)
        process.exitCode = undefined
    })
})

async function start(app: ReturnType<typeof createApp>) {
    const server = http.createServer(app)
    servers.push(server)
    await new Promise<void>((resolve, reject) => {
        server.once("error", reject)
        server.listen(0, "127.0.0.1", resolve)
    })
    const address = server.address()
    if (!address || typeof address === "string") {
        throw new Error("Test server did not bind to a TCP port")
    }
    return `http://127.0.0.1:${address.port}`
}
