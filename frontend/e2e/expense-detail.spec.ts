import { expect, test, type Page } from '@playwright/test'
import {
  apiCreateGroup,
  apiSignUpAndLogIn,
  uniqueUsername,
} from './helpers'

async function createExpenseGroup(
  page: Page,
  expenseName: string,
  expenseCurrency: string,
  amount: string,
) {
  await apiSignUpAndLogIn(page, uniqueUsername('expense-detail'))
  const groupId = await apiCreateGroup(page, 'Expense detail', 'Alex', 'USD')
  const membersResponse = await page.request.get(`/api/groups/${groupId}/members`)
  expect(membersResponse.ok()).toBe(true)
  const membersPayload = await membersResponse.json() as {
    data: { members: Array<{ userId: string; userGroupName: string }> }
  }
  const member = membersPayload.data.members[0]
  const response = await page.request.post('/api/expenses/addexpense', {
    data: {
      groupId,
      expenseName,
      expenseTotal: amount,
      expenseDate: '2026-07-30',
      expenseCurrency,
      paidBy: [{ userId: member.userId, amount }],
      splits: [{ userId: member.userId, amount }],
    },
  })
  expect(response.ok()).toBe(true)
  await page.goto(`/group/${groupId}`)
  return { member, page }
}

test('same-currency detail shows payer and share amounts without FX', async ({ page }) => {
  const { member } = await createExpenseGroup(
    page, 'Same-currency meal', 'USD', '10.00',
  )
  await page.getByRole('button', {
    name: 'View details for Same-currency meal',
  }).click()
  const dialog = page.getByRole('dialog', {
    name: 'Same-currency meal expense details',
  })
  await expect(dialog.getByRole('list', { name: 'Payers' }))
    .toContainText(`${member.userGroupName}USD 10.00`)
  await expect(dialog.getByRole('list', { name: 'Shares' }))
    .toContainText(`${member.userGroupName}USD 10.00`)
  await expect(dialog.getByLabel('Saved conversion rate')).toHaveCount(0)
})

test('cross-currency detail shows the saved FX inputs', async ({ page }) => {
  const { member } = await createExpenseGroup(
    page, 'Cross-currency ride', 'SGD', '20.00',
  )
  await page.getByRole('button', {
    name: 'View details for Cross-currency ride',
  }).click()
  const dialog = page.getByRole('dialog', {
    name: 'Cross-currency ride expense details',
  })
  await expect(dialog.getByRole('list', { name: 'Payers' }))
    .toContainText(`${member.userGroupName}SGD 20.00`)
  await expect(dialog.getByLabel('Saved conversion rate'))
    .toContainText(/1 SGD = 0\.74\d* USD/)
  await expect(dialog.getByLabel('Saved conversion rate'))
    .toContainText('The saved rate is fixed for this expense.')
})
