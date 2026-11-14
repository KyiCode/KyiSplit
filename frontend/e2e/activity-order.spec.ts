import { expect, test } from '@playwright/test'
import { apiCreateGroup, apiSignUpAndLogIn, uniqueUsername } from './helpers'

test('recent activity is ordered by local expense date', async ({ page }) => {
  const ownerUsername = uniqueUsername('activity-order')
  await apiSignUpAndLogIn(page, ownerUsername)
  const groupId = await apiCreateGroup(page, 'Activity order', 'Alex', 'USD')
  const membersResponse = await page.request.get(`/api/groups/${groupId}/members`)
  expect(membersResponse.ok()).toBe(true)
  const membersPayload = await membersResponse.json() as {
    data: { members: Array<{ userId: string }> }
  }
  const memberId = membersPayload.data.members[0].userId

  for (const [name, date] of [
    ['Middle date', '2026-10-19'],
    ['Oldest date', '2026-10-18'],
    ['Newest date', '2026-10-20'],
  ]) {
    const response = await page.request.post('/api/expenses/addexpense', {
      data: {
        groupId,
        expenseName: name,
        expenseTotal: '10.00',
        expenseDate: date,
        expenseCurrency: 'USD',
        paidBy: [{ userId: memberId, amount: '10.00' }],
        splits: [{ userId: memberId, amount: '10.00' }],
      },
    })
    expect(response.ok()).toBe(true)
  }

  await page.goto(`/group/${groupId}`)
  const activity = page.getByRole('list', { name: 'Recent expenses' })
  await expect(activity.locator('li')).toHaveText([
    /Newest date/,
    /Middle date/,
    /Oldest date/,
  ])
})
