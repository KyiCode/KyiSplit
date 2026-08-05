import { expect, test } from '@playwright/test'
import {
  apiCreateGroup,
  apiCreateInvite,
  apiLogOut,
  apiSignUpAndLogIn,
  chooseCurrency,
  installCurrencyFixture,
  logIn,
  uniqueEmail,
} from './helpers'

// Keep these independent scenarios in a deliberately non-narrative order.
// The repeated run and this shuffled order guard against state leaking between tests.
test('group loading retries after a transient browser failure', async ({ page }) => {
  await apiSignUpAndLogIn(page, uniqueEmail('retry-owner'))
  await apiCreateGroup(page, 'Retry group', 'Owner')
  let attempts = 0
  await page.route('**/api/groups/grouplist', async route => {
    attempts += 1
    if (attempts === 1) await route.abort('connectionfailed')
    else await route.continue()
  })

  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Check your connection')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: /Retry group/ })).toBeVisible()
  expect(attempts).toBe(2)
})

test('expired invitation is rejected', async ({ page, request }) => {
  const owner = uniqueEmail('expired-owner')
  await apiSignUpAndLogIn(page, owner)
  const groupId = await apiCreateGroup(page, 'Expired invite group', 'Owner')
  const inviteUrl = await apiCreateInvite(page, groupId)
  const token = inviteUrl.split('/').pop()!
  await apiLogOut(page)
  await apiSignUpAndLogIn(page, uniqueEmail('expired-joiner'))

  const expired = await request.post(
    `http://127.0.0.1:5512/__e2e/invites/${token}/expire`,
  )
  expect(expired.status()).toBe(204)
  await page.goto(inviteUrl)
  await page.getByLabel('Your name in this group').fill('Late member')
  await page.getByRole('button', { name: 'Join group' }).click()
  await expect(page.getByRole('alert')).toContainText('invite has expired')
})

test('provider failure leaves no partial expense', async ({ page, request }) => {
  await installCurrencyFixture(page)
  await apiSignUpAndLogIn(page, uniqueEmail('fx-owner'))
  const groupId = await apiCreateGroup(page, 'FX rollback group', 'Owner', 'USD')
  await page.goto(`/group/${groupId}/addexpense`)
  await page.getByLabel('Description').fill('Failed conversion')
  await page.getByLabel('Total amount').fill('10.00')
  await page.getByRole('button', { name: /Expense currency: USD/ }).click()
  await chooseCurrency(page, 'SGD')
  await page.getByLabel('Owner paid amount').fill('10.00')
  await page.getByLabel('Owner split amount').fill('10.00')
  const control = await request.post('http://127.0.0.1:5512/__e2e/fx/fail-next')
  expect(control.status()).toBe(204)
  await page.getByRole('button', { name: 'Add expense' }).click()
  await expect(page.getByRole('alert')).toContainText('Exchange rate is unavailable')

  const expenses = await page.request.get(`/api/expenses/${groupId}`)
  expect(expenses.ok()).toBe(true)
  expect((await expenses.json()).data.expenses).toEqual([])
})

test('a user cannot open another group', async ({ page }) => {
  await apiSignUpAndLogIn(page, uniqueEmail('group-owner'))
  const groupId = await apiCreateGroup(page, 'Private group', 'Owner')
  await apiLogOut(page)
  await apiSignUpAndLogIn(page, uniqueEmail('outsider'))

  await page.goto(`/group/${groupId}`)
  await expect(page.getByRole('heading', { name: 'Group access denied' })).toBeVisible()
})

test('unauthenticated navigation is restored after login', async ({ page }) => {
  const owner = uniqueEmail('restore-owner')
  await apiSignUpAndLogIn(page, owner)
  const groupId = await apiCreateGroup(page, 'Restored group', 'Owner')
  await apiLogOut(page)

  await page.goto(`/group/${groupId}`)
  await expect(page).toHaveURL(/\/auth$/)
  await logIn(page, owner)
  await expect(page).toHaveURL(new RegExp(`/group/${groupId}$`))
  await expect(page.getByRole('heading', { name: 'Restored group' })).toBeVisible()
})
