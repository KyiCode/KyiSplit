import fs from 'node:fs'
import { expect, test as setup } from '@playwright/test'

setup('isolated database and services are ready', async ({ request }) => {
  const stateFile = process.env.E2E_RUN_STATE_FILE
  expect(stateFile, 'E2E_RUN_STATE_FILE must be configured').toBeTruthy()
  expect(fs.existsSync(stateFile!)).toBe(true)

  const response = await request.get('/api/users/verifysession')
  expect(response.status()).toBe(401)
})
