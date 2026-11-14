import { expect, test } from '@playwright/test'
import { apiCreateGroup, apiSignUpAndLogIn, uniqueUsername } from './helpers'
import { clearSafeDiagnostic, recordSafeDiagnostic } from './safeDiagnostics.mjs'

test('narrow layout keeps long activity and amounts readable without horizontal overflow', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 390, height: 844 })
  recordSafeDiagnostic('test-assertion', 'expectation-failed', 'mobile-test-account')
  await apiSignUpAndLogIn(page, uniqueUsername('mobile-layout'))
  clearSafeDiagnostic()
  const memberName = 'Alexandria The Traveler With A Long Group Name'
  const groupName = 'Weekend Across Tokyo, Yokohama, and Kamakura'
  recordSafeDiagnostic('test-assertion', 'expectation-failed', 'mobile-group-create')
  const groupId = await apiCreateGroup(page, groupName, memberName, 'USD')
  clearSafeDiagnostic()
  const membersResponse = await page.request.get(`/api/groups/${groupId}/members`)
  expect(membersResponse.ok()).toBe(true)
  const membersPayload = await membersResponse.json() as {
    data: { members: Array<{ userId: string }> }
  }
  const memberId = membersPayload.data.members[0].userId
  const expenseName = 'Airport transfer and first night accommodation'
  recordSafeDiagnostic('test-assertion', 'expectation-failed', 'mobile-expense-create')
  const expenseResponse = await page.request.post('/api/expenses/addexpense', {
    data: {
      groupId,
      expenseName,
      expenseTotal: '1234567.89',
      expenseDate: '2026-10-20',
      expenseCurrency: 'USD',
      paidBy: [{ userId: memberId, amount: '1234567.89' }],
      splits: [{ userId: memberId, amount: '1234567.89' }],
    },
  })
  if (!expenseResponse.ok()) {
    clearSafeDiagnostic()
    recordSafeDiagnostic(
      'test-assertion',
      'expectation-failed',
      expenseResponse.status() >= 500
        ? 'mobile-expense-server-error'
        : expenseResponse.status() >= 400
          ? 'mobile-expense-validation-error'
          : 'mobile-expense-unexpected-status',
    )
  }
  expect(expenseResponse.ok()).toBe(true)
  clearSafeDiagnostic()

  let releaseBalanceRequest!: () => void
  const heldBalanceRequest = new Promise<void>(resolve => {
    releaseBalanceRequest = resolve
  })
  await page.route('**/api/groups/*/getbalance', async route => {
    await heldBalanceRequest
    await route.continue()
  })
  await page.goto(`/group/${groupId}`)
  recordSafeDiagnostic('test-assertion', 'expectation-failed', 'mobile-page-load')
  await expect(page.getByRole('heading', { name: groupName })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Loading balances' })).toBeVisible()
  releaseBalanceRequest()
  await expect(page.getByRole('region', { name: 'Balances' }).locator('.balance-row'))
    .toHaveCount(1)
  clearSafeDiagnostic()
  recordSafeDiagnostic('test-assertion', 'expectation-failed', 'mobile-no-overflow')
  const viewport = await page.evaluate(() => {
    const browserDocument = (globalThis as unknown as {
      document: { documentElement: { clientWidth: number; scrollWidth: number } }
    }).document
    return {
      width: browserDocument.documentElement.clientWidth,
      scrollWidth: browserDocument.documentElement.scrollWidth,
    }
  })
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width)
  clearSafeDiagnostic()

  await page.keyboard.press('Tab')
  const focusStyle = await page.evaluate(() => {
    const browserDocument = (globalThis as unknown as {
      document: {
        activeElement: { matches: (selector: string) => boolean }
        defaultView: {
          getComputedStyle: (element: unknown) => {
            outlineStyle: string
            outlineWidth: string
          }
        }
      }
    }).document
    const active = browserDocument.activeElement
    const style = browserDocument.defaultView.getComputedStyle(active)
    return {
      focusVisible: active.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    }
  })
  expect(focusStyle).toEqual({
    focusVisible: true,
    outlineStyle: 'solid',
    outlineWidth: '2px',
  })

  const detailTrigger = page.getByRole('button', {
    name: `View details for ${expenseName}`,
  })
  await expect(detailTrigger).toBeVisible()
  await detailTrigger.click()
  recordSafeDiagnostic('test-assertion', 'expectation-failed', 'mobile-detail-amount')
  const details = page.getByRole('dialog', {
    name: `${expenseName} expense details`,
  })
  await expect(details).toContainText('USD 1234567.89')
  clearSafeDiagnostic()
  recordSafeDiagnostic('test-assertion', 'expectation-failed', 'mobile-dialog-width')
  const dialogSize = await details.evaluate(element => ({
    width: element.getBoundingClientRect().width,
    viewportWidth: (globalThis as unknown as {
      document: { documentElement: { clientWidth: number } }
    }).document.documentElement.clientWidth,
  }))
  expect(dialogSize.width).toBeLessThanOrEqual(dialogSize.viewportWidth)
  clearSafeDiagnostic()
})
