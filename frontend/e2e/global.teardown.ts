import { test as teardown } from '@playwright/test'
import { stopRunPostgres } from '../../backend/e2e/database'

teardown('drop the run-scoped database', async () => {
  await stopRunPostgres(process.env)
})
