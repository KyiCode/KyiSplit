import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { startFxServer } from '../../e2e/fxServer'

const servers: Awaited<ReturnType<typeof startFxServer>>[] = []

afterEach(async () => {
    await Promise.all(servers.splice(0).map(server => (
        new Promise<void>((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve())
        })
    )))
})

describe('deterministic E2E FX provider', () => {
    it('returns fixed quotes and rejects unsupported pairs', async () => {
        const server = await startFxServer(0)
        servers.push(server)
        const port = (server.address() as AddressInfo).port

        const quote = await fetch(
            `http://127.0.0.1:${port}/v2/rate/USD/SGD`
        )
        expect(await quote.json()).toEqual({
            rate: 1.35,
            date: '2026-07-30'
        })

        const unsupported = await fetch(
            `http://127.0.0.1:${port}/v2/rate/EUR/SGD`
        )
        expect(unsupported.status).toBe(404)
    })

    it('can fail exactly the next supported quote', async () => {
        const server = await startFxServer(0)
        servers.push(server)
        const port = (server.address() as AddressInfo).port

        const control = await fetch(
            `http://127.0.0.1:${port}/__e2e/fx/fail-next`,
            { method: 'POST' }
        )
        expect(control.status).toBe(204)

        const failed = await fetch(
            `http://127.0.0.1:${port}/v2/rate/SGD/USD`
        )
        expect(failed.status).toBe(503)

        const recovered = await fetch(
            `http://127.0.0.1:${port}/v2/rate/SGD/USD`
        )
        expect(recovered.status).toBe(200)
    })
})
