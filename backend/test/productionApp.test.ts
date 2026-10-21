import fs from 'node:fs/promises'
import http, { type Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import type { NextFunction, Request, Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, logUnhandledRequestError } from '../src/app'
import { logger } from '../src/logging/logger'

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
    vi.restoreAllMocks()
})

describe('production application serving', () => {
    it('returns a sanitized validation error for malformed JSON', async () => {
        const errorLog = vi.spyOn(logger, 'error')
        const warningLog = vi.spyOn(logger, 'warn')
        const origin = await start(createApp())
        const rawBody = '{"password":"malformed-secret","token":"unterminated'

        const response = await fetch(`${origin}/api/users/signup`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: rawBody
        })
        const responseText = await response.text()

        expect(response.status).toBe(400)
        expect(JSON.parse(responseText)).toEqual({
            status: 'fail',
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON request body'
        })
        expect(responseText).not.toContain('malformed-secret')
        expect(responseText).not.toContain('SyntaxError')
        expect(errorLog).not.toHaveBeenCalled()
        expect(warningLog).toHaveBeenCalledWith(
            'request_body_rejected',
            { method: 'POST', operation: 'request_json_parse' }
        )
        expect(JSON.stringify(warningLog.mock.calls)).not.toContain('malformed-secret')
        expect(JSON.stringify(warningLog.mock.calls)).not.toContain('unterminated')
    })

    it('preserves the oversized JSON body response', async () => {
        const origin = await start(createApp({ requestBodyLimitBytes: 8 }))

        const response = await fetch(`${origin}/api/users/signup`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{"value":"too large"}'
        })

        expect(response.status).toBe(413)
        expect(await response.json()).toEqual({
            status: 'fail',
            code: 'VALIDATION_ERROR',
            message: 'Request body too large'
        })
    })

    it('keeps unrelated internal errors on the generic 500 path', () => {
        const error = new Error('database operation failed')
        const response = {
            headersSent: false,
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        } as unknown as Response
        const next = vi.fn() as NextFunction

        logUnhandledRequestError(
            error,
            { method: 'POST', route: { path: '/example' }, baseUrl: '/api' } as Request,
            response,
            next
        )

        expect(response.status).toHaveBeenCalledWith(500)
        expect(response.json).toHaveBeenCalledWith({
            status: 'fail',
            code: 'INTERNAL_ERROR',
            message: 'Server error'
        })
        expect(next).not.toHaveBeenCalled()
    })

    it('passes unrelated errors to Express after headers are sent', () => {
        const error = new Error('downstream failure')
        const response = {
            headersSent: true,
            status: vi.fn(),
            json: vi.fn()
        } as unknown as Response
        const next = vi.fn() as NextFunction

        logUnhandledRequestError(
            error,
            { method: 'GET', route: { path: '/example' }, baseUrl: '/api' } as Request,
            response,
            next
        )

        expect(response.status).not.toHaveBeenCalled()
        expect(response.json).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(error)
    })

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
