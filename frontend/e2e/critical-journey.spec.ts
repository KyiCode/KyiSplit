import { expect, test } from '@playwright/test'
import {
  PASSWORD,
  chooseCurrency,
  installCurrencyFixture,
  logIn,
  signUp,
  signUpAndLogIn,
  uniqueEmail,
} from './helpers'

test('signup through repayment and confirmed deletion', async ({ page }) => {
  test.setTimeout(120_000)
  await installCurrencyFixture(page)

  const ownerEmail = uniqueEmail('journey-owner')
  const blairEmail = uniqueEmail('journey-blair')
  const caseyEmail = uniqueEmail('journey-casey')

  await signUpAndLogIn(page, ownerEmail)
  await page.getByRole('button', { name: /Start a new group/ }).click()
  await page.getByLabel('Group name').fill('Tokyo Weekend')
  await page.getByLabel('Your name in this group').fill('Alex')
  await page.getByRole('button', { name: 'Choose group currency' }).click()
  await chooseCurrency(page, 'USD')
  await page.getByRole('button', { name: 'Create group' }).click()
  await page.getByRole('button', { name: /Tokyo Weekend/ }).click()
  await expect(page.getByRole('heading', { name: 'Tokyo Weekend' })).toBeVisible()
  await expect(page.getByText('USD', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Invite people' }).click()
  const inviteUrl = await page.locator('.invite-banner p').innerText()
  expect(inviteUrl).toMatch(/\/join\/[0-9a-f]{64}$/)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.goto(inviteUrl)
  await page.getByRole('button', { name: 'Create an account' }).click()
  await signUp(page, blairEmail)
  await page.goto('/auth')
  await page.getByRole('textbox', { name: 'Email' }).fill(blairEmail)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(new RegExp(`/join/${inviteUrl.split('/').pop()}$`))
  await page.getByLabel('Your name in this group').fill('Blair')
  await page.getByRole('button', { name: 'Join group' }).click()
  await expect(page.getByRole('heading', { name: 'Tokyo Weekend' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.goto(inviteUrl)
  await page.getByRole('button', { name: 'Create an account' }).click()
  await signUp(page, caseyEmail)
  await page.goto('/auth')
  await page.getByRole('textbox', { name: 'Email' }).fill(caseyEmail)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByLabel('Your name in this group').fill('Casey')
  await page.getByRole('button', { name: 'Join group' }).click()
  await expect(page.getByRole('list', { name: 'Group members' })).toContainText('Casey')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await logIn(page, ownerEmail)
  await page.getByRole('button', { name: /Tokyo Weekend/ }).click()
  await page.getByRole('button', { name: /Add expense/ }).click()
  await page.getByLabel('Description').fill('Rail passes')
  await page.getByLabel('Total amount').fill('100.00')
  await page.getByRole('button', { name: /Expense currency: USD/ }).click()
  await chooseCurrency(page, 'SGD')
  await page.getByLabel('Alex paid amount').fill('60.00')
  await page.getByLabel('Blair paid amount').fill('40.00')
  await page.getByLabel('Casey paid amount').fill('0.00')
  await page.getByLabel('Alex split amount').fill('20.00')
  await page.getByLabel('Blair split amount').fill('30.00')
  await page.getByLabel('Casey split amount').fill('50.00')
  await page.getByRole('button', { name: 'Add expense' }).click()

  await expect(page.getByRole('button', { name: 'View details for Rail passes' })).toBeVisible()
  const balances = page.getByRole('region', { name: 'Balances' })
  await expect(balances.locator('.balance-row').filter({ hasText: 'Alex' })).toContainText('USD 29.60')
  await expect(balances.locator('.balance-row').filter({ hasText: 'Blair' })).toContainText('USD 7.40')
  await expect(balances.locator('.balance-row').filter({ hasText: 'Casey' })).toContainText('USD 37.00')
  const suggestions = page.getByRole('list', { name: 'Settlement suggestions' })
  await expect(suggestions).toContainText('Casey pays Alex')
  await expect(suggestions).toContainText('USD 29.60')
  await expect(suggestions).toContainText('Casey pays Blair')
  await expect(suggestions).toContainText('USD 7.40')

  const repayments = page.getByRole('region', { name: 'Repayments' })
  await repayments.getByLabel('Payer').selectOption({ label: 'Casey' })
  await repayments.getByLabel('Receiver').selectOption({ label: 'Alex' })
  await repayments.getByLabel('Amount').fill('10.00')
  await repayments.getByLabel('Repayment date').fill('2026-07-30')
  await repayments.getByRole('button', { name: 'Record repayment' }).click()
  await expect(page.getByRole('list', { name: 'Repayment history' })).toContainText('Casey paid Alex')
  await expect(balances.locator('.balance-row').filter({ hasText: 'Alex' })).toContainText('USD 19.60')
  await expect(balances.locator('.balance-row').filter({ hasText: 'Casey' })).toContainText('USD 27.00')

  await repayments.getByRole('button', { name: 'Delete repayment from Casey to Alex' }).click()
  await expect(page.getByRole('dialog', { name: 'Delete repayment?' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete repayment', exact: true }).click()
  await expect(repayments).toContainText('No repayments recorded yet.')
  await expect(balances).toContainText('USD 29.60')
  await expect(balances).toContainText('USD 37.00')

  await page.getByRole('button', { name: 'View details for Rail passes' }).click()
  await page.getByRole('button', { name: 'Delete expense' }).click()
  await expect(page.getByRole('dialog', { name: 'Delete Rail passes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete expense', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View details for Rail passes' })).toHaveCount(0)
  await expect(balances).toContainText('USD 0.00')
  await expect(balances).toContainText('No repayments needed.')
})
