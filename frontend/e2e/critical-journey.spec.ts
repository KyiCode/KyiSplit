import { expect, test } from '@playwright/test'
import {
  clearSafeDiagnostic,
  recordSafeDiagnostic,
} from './safeDiagnostics.mjs'
import {
  PASSWORD,
  chooseCurrency,
  expectSafePath,
  isInvitePath,
  installCurrencyFixture,
  logIn,
  signUp,
  uniqueUsername,
} from './helpers'

function markJourneyCheckpoint(name: string) {
  test.info().annotations.push({ type: 'safe-e2e-checkpoint', description: name })
}

test('signup through repayment and confirmed deletion', async ({ page }) => {
  test.setTimeout(120_000)
  markJourneyCheckpoint('journey-fixture')
  await installCurrencyFixture(page)

  markJourneyCheckpoint('journey-owner-group')
  const ownerUsername = uniqueUsername('journey-owner')
  const blairUsername = uniqueUsername('journey-blair')
  const caseyUsername = uniqueUsername('journey-casey')

  await signUp(page, ownerUsername)
  markJourneyCheckpoint('journey-owner-signup')
  recordSafeDiagnostic(
    'test-assertion',
    'expectation-failed',
    'journey-owner-login',
  )
  await logIn(page, ownerUsername)
  clearSafeDiagnostic()
  markJourneyCheckpoint('journey-owner-login')
  await page.getByRole('button', { name: /Start a new group/ }).click()
  await page.getByLabel('Group name').fill('Tokyo Weekend')
  await page.getByLabel('Your name in this group').fill('Alex')
  await page.getByRole('button', { name: 'Choose group currency' }).click()
  await chooseCurrency(page, 'USD')
  const groupCreateResponsePromise = page.waitForResponse(response => {
    const request = response.request()
    return request.method() === 'POST' &&
      new URL(response.url()).pathname === '/api/groups/addgroup'
  })
  const groupListResponsePromise = page.waitForResponse(response => {
    const request = response.request()
    return request.method() === 'GET' &&
      new URL(response.url()).pathname === '/api/groups/grouplist'
  }, { timeout: 8_000 })
  await page.getByRole('button', { name: 'Create group' }).click()
  const groupCreateResponse = await groupCreateResponsePromise
  if (!groupCreateResponse.ok()) {
    recordSafeDiagnostic(
      'test-assertion',
      'expectation-failed',
      'journey-group-post-failure',
    )
  }
  recordSafeDiagnostic(
    'test-assertion',
    'expectation-failed',
    'journey-group-refresh-pending',
  )
  const groupListResponse = await groupListResponsePromise
  clearSafeDiagnostic()
  recordSafeDiagnostic(
    'test-assertion',
    'expectation-failed',
    groupListResponse.ok()
      ? 'journey-group-refresh-success'
      : 'journey-group-refresh-failure',
  )
  markJourneyCheckpoint('journey-group-create')
  await expect(page.getByRole('heading', { name: 'Tokyo Weekend' })).toBeVisible()
  await expect(page.getByText('USD', { exact: true }).first()).toBeVisible()
  clearSafeDiagnostic()

  markJourneyCheckpoint('journey-invite-create')
  await page.getByRole('button', { name: 'Invite people' }).click()
  const inviteUrl = await page.locator('.invite-banner p').innerText()
  expect(isInvitePath(inviteUrl), 'Invite link format is invalid.').toBe(true)

  await page.getByRole('button', { name: 'Sign out' }).click()
  markJourneyCheckpoint('journey-invite-blair')
  await page.goto(inviteUrl)
  await page.getByRole('button', { name: 'Create an account' }).click()
  await signUp(page, blairUsername)
  await page.goto('/auth')
  await page.getByRole('textbox', { name: 'Username' }).fill(blairUsername)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expectSafePath(
    page,
    /^\/join\/[0-9a-f]{64}$/i,
    'Sign in should restore the pending invite route.',
  )
  await page.getByLabel('Your name in this group').fill('Blair')
  await page.getByRole('button', { name: 'Join group' }).click()
  await expect(page.getByRole('heading', { name: 'Tokyo Weekend' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  markJourneyCheckpoint('journey-invite-casey')
  await page.goto(inviteUrl)
  await page.getByRole('button', { name: 'Create an account' }).click()
  await signUp(page, caseyUsername)
  await page.goto('/auth')
  await page.getByRole('textbox', { name: 'Username' }).fill(caseyUsername)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByLabel('Your name in this group').fill('Casey')
  await page.getByRole('button', { name: 'Join group' }).click()
  await expect(page.getByRole('list', { name: 'Group members' })).toContainText('Casey')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await logIn(page, ownerUsername)
  await page.getByRole('button', { name: /Tokyo Weekend/ }).click()
  markJourneyCheckpoint('journey-expense-create')
  await page.getByRole('button', { name: /Add expense/ }).click()
  const localDate = await page.evaluate(() => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${now.getFullYear()}-${month}-${day}`
  })
  await expect(page.locator('input[type="date"]')).toHaveValue(localDate)
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

  markJourneyCheckpoint('journey-balance-results')
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
  let failNextBalanceRefresh = true
  await page.route('**/api/groups/*/getbalance', route => {
    if (failNextBalanceRefresh) {
      failNextBalanceRefresh = false
      return route.abort('connectionfailed')
    }
    return route.continue()
  })
  markJourneyCheckpoint('journey-repayment-create')
  await repayments.getByLabel('Payer').selectOption({ label: 'Casey' })
  await repayments.getByLabel('Receiver').selectOption({ label: 'Alex' })
  await repayments.getByLabel('Amount').fill('10.00')
  await repayments.getByLabel('Repayment date').fill('2026-07-30')
  await repayments.getByRole('button', { name: 'Record repayment' }).click()
  await expect(page.getByRole('list', { name: 'Repayment history' })).toContainText('Casey paid Alex')
  await expect(balances.getByRole('alert')).toContainText('offline')
  await expect(balances.getByRole('status')).toContainText(
    'Showing balances and suggestions from the last successful load.',
  )
  await balances.getByRole('button', { name: 'Retry balances' }).click()
  await expect(balances.locator('.balance-row').filter({ hasText: 'Alex' })).toContainText('USD 19.60')
  await expect(balances.locator('.balance-row').filter({ hasText: 'Casey' })).toContainText('USD 27.00')
  await expect(balances.getByRole('alert')).toHaveCount(0)

  markJourneyCheckpoint('journey-repayment-delete')
  await repayments.getByRole('button', { name: 'Delete repayment from Casey to Alex' }).click()
  await expect(page.getByRole('dialog', { name: 'Delete repayment?' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete repayment', exact: true }).click()
  await expect(repayments).toContainText('No repayments recorded yet.')
  await expect(balances).toContainText('USD 29.60')
  await expect(balances).toContainText('USD 37.00')

  markJourneyCheckpoint('journey-expense-delete')
  await page.getByRole('button', { name: 'View details for Rail passes' }).click()
  await page.getByRole('button', { name: 'Delete expense' }).click()
  await expect(page.getByRole('dialog', { name: 'Delete Rail passes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete expense', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View details for Rail passes' })).toHaveCount(0)
  await expect(balances).toContainText('USD 0.00')
  await expect(balances).toContainText('No repayments needed.')
  await expect(page.getByRole('heading', { name: 'Nothing split yet' })).toBeVisible()
})
