import fs from 'node:fs/promises'
import http, { type Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'

const servers: Server[] = []
const directories: string[] = []

afterEach(async () => {
    await Promise.all(servers.splice(0).map(server => (
        new Promise<void>((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve())
        })
    )))
    await Promise.all(directories.splice(0).map(directory => (
        fs.rm(directory, { force: true, recursive: true })
    )))
})

describe('production application serving', () => {
    it('keeps API routes ahead of static files and browser fallback', async () => {
        const frontendRoot = await frontendBuild()
        const origin = await start(createApp({ frontendRoot }))

        const asset = await fetch(`${origin}/assets/app.js`)
        expect(asset.status).toBe(200)
        expect(await asset.text()).toBe('console.log("kyisplit")')

        const browserRoute = await fetch(`${origin}/group/example`, {
            headers: { accept: 'text/html' }
        })
        expect(browserRoute.status).toBe(200)
        expect(await browserRoute.text()).toContain('<div id="root"></div>')

        const validApi = await fetch(`${origin}/api/users/verifysession`)
        expect(validApi.status).toBe(401)
        expect(await validApi.json()).toMatchObject({
            status: 'fail',
            code: 'UNAUTHENTICATED'
        })

        const missingApi = await fetch(`${origin}/api/does-not-exist`, {
            headers: { accept: 'text/html' }
        })
        expect(missingApi.status).toBe(404)
        expect(missingApi.headers.get('content-type')).toContain(
            'application/json'
        )
        expect(await missingApi.json()).toEqual({
            status: 'fail',
            code: 'NOT_FOUND',
            message: 'API route not found'
        })

        const missingAsset = await fetch(`${origin}/assets/missing.js`, {
            headers: { accept: 'text/html' }
        })
        expect(missingAsset.status).toBe(404)
        expect(await missingAsset.text()).not.toContain('<div id="root"></div>')
    })

    it('does not require cross-origin headers for production requests', async () => {
        const origin = await start(createApp({
            frontendRoot: await frontendBuild()
        }))

        const response = await fetch(origin, {
            headers: { origin: 'https://different.example' }
        })
        expect(response.status).toBe(200)
        expect(response.headers.get('access-control-allow-origin')).toBeNull()
    })

    it('fails before listening when the frontend build is incomplete', async () => {
        const frontendRoot = await fs.mkdtemp(
            path.join(os.tmpdir(), 'kyisplit-missing-build-')
        )
        directories.push(frontendRoot)

        expect(() => createApp({ frontendRoot })).toThrow(
            'Production frontend build is incomplete'
        )
    })
})

async function frontendBuild() {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), 'kyisplit-frontend-build-')
    )
    directories.push(directory)
    await fs.mkdir(path.join(directory, 'assets'))
    await fs.writeFile(
        path.join(directory, 'index.html'),
        '<!doctype html><div id="root"></div>'
    )
    await fs.writeFile(
        path.join(directory, 'assets', 'app.js'),
        'console.log("kyisplit")'
    )
    return directory
}

async function start(app: ReturnType<typeof createApp>) {
    const server = http.createServer(app)
    servers.push(server)
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') {
        throw new Error('Test server did not bind to a TCP port')
    }
    return `http://127.0.0.1:${address.port}`
}
