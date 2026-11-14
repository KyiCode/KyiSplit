import { expect, test } from '@playwright/test'
import { expectSafePath } from './helpers'

test('signup establishes an authenticated browser journey', async ({ page }) => {
  const username = `e2e-${Date.now()}-${test.info().retry}`
  const password = 'correct horse battery staple'

  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Username' }).fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Signup token').fill('e2e-only-signup-token')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('status')).toContainText('Account created')

  await expectSafePath(page, /\/auth$/, 'Signup should return to sign in.')
  await page.getByRole('textbox', { name: 'Username' }).fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expectSafePath(page, /^\/$/, 'Sign in should open the groups page.')
  await expect(page.getByRole('heading', { name: 'Groups', exact: true })).toBeVisible()
})
