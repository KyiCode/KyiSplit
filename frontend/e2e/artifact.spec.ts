import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

test('versioned artifact serves browser assets without intercepting API routes', async ({ request }) => {
  const metadata = JSON.parse(await fs.readFile(
    path.resolve('../release/kyisplit/release.json'),
    'utf8',
  )) as { name: string, version: string }
  expect(metadata).toEqual({ name: 'kyisplit', version: 'e2e' })

  const browserRoute = await request.get('/group/direct-navigation', {
    headers: { accept: 'text/html' },
  })
  expect(browserRoute.status()).toBe(200)
  const html = await browserRoute.text()
  expect(html).toContain('<div id="root"></div>')
  const assetPath = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1]
  expect(assetPath).toBeTruthy()
  const asset = await request.get(assetPath!)
  expect(asset.status()).toBe(200)
  expect(asset.headers()['content-type']).toContain('javascript')

  const api = await request.get('/api/users/verifysession')
  expect(api.status()).toBe(401)
  expect((await api.json()).code).toBe('UNAUTHENTICATED')

  const missingApi = await request.get('/api/not-a-route', {
    headers: { accept: 'text/html' },
  })
  expect(missingApi.status()).toBe(404)
  expect(missingApi.headers()['content-type']).toContain('application/json')
  expect((await missingApi.json()).code).toBe('NOT_FOUND')
})
