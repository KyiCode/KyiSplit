import { expect, test, type Page } from '@playwright/test'
import {
  apiCreateGroup,
  apiCreateInvite,
  apiLogOut,
  apiSignUpAndLogIn,
  logIn,
  uniqueEmail,
} from './helpers'

async function prepareKeyboardGroup(page: Page) {
  const ownerEmail = uniqueEmail('keyboard-owner')
  await apiSignUpAndLogIn(page, ownerEmail)
  const groupId = await apiCreateGroup(page, 'Keyboard check', 'Kai', 'SGD')
  const inviteUrl = await apiCreateInvite(page, groupId)
  const inviteToken = inviteUrl.split('/').pop()!

  await apiLogOut(page)
  await apiSignUpAndLogIn(page, uniqueEmail('keyboard-member'))
  const joinResponse = await page.request.post(
    `/api/groups/join/${inviteToken}`,
    { data: { userName: 'Sam' } },
  )
  expect(joinResponse.ok()).toBe(true)

  await apiLogOut(page)
  await logIn(page, ownerEmail)
  const membersResponse = await page.request.get(`/api/groups/${groupId}/members`)
  const memberPayload = await membersResponse.json() as {
    data: { members: Array<{ userId: string; userGroupName: string }> }
  }
  const owner = memberPayload.data.members.find(member => member.userGroupName === 'Kai')!
  const member = memberPayload.data.members.find(entry => entry.userGroupName === 'Sam')!

  const expenseResponse = await page.request.post('/api/expenses/addexpense', {
    data: {
      groupId,
      expenseName: 'Keyboard expense',
      expenseTotal: '10.00',
      expenseDate: '2026-07-30',
      expenseCurrency: 'SGD',
      paidBy: [{ userId: owner.userId, amount: '10.00' }],
      splits: [{ userId: member.userId, amount: '10.00' }],
    },
  })
  expect(expenseResponse.ok()).toBe(true)
  const repaymentResponse = await page.request.post(
    `/api/groups/${groupId}/repayments`,
    { data: {
      payerUserId: member.userId,
      receiverUserId: owner.userId,
      amount: '1.00',
      repaymentDate: '2026-07-30',
    } },
  )
  expect(repaymentResponse.ok()).toBe(true)
  await page.goto(`/group/${groupId}`)

  return {
    expenseTrigger: page.getByRole('button', {
      name: 'View details for Keyboard expense',
    }),
    repaymentTrigger: page.getByRole('button', {
      name: 'Delete repayment from Sam to Kai',
    }),
  }
}

async function openExpenseConfirmation(page: Page) {
  const expenseTrigger = page.getByRole('button', {
    name: 'View details for Keyboard expense',
  })
  await expenseTrigger.click()
  const details = page.getByRole('dialog', {
    name: 'Keyboard expense expense details',
  })
  await expect(details).toBeVisible()
  await details.getByRole('button', { name: 'Delete expense' }).click()
  const confirmation = page.getByRole('dialog', {
    name: 'Delete Keyboard expense?',
  })
  return { expenseTrigger, details, confirmation }
}

test('Enter on Keep cancels expense deletion', async ({ page }) => {
  test.setTimeout(90_000)
  await prepareKeyboardGroup(page)
  let deleteRequests = 0
  page.on('request', request => {
    if (request.method() === 'DELETE') deleteRequests += 1
  })

  const { confirmation } = await openExpenseConfirmation(page)
  const keepExpense = confirmation.getByRole('button', { name: 'Keep expense' })
  await expect(keepExpense).toBeVisible()
  await keepExpense.focus()
  await page.keyboard.press('Enter')
  await expect(confirmation).toHaveCount(0)
  expect(deleteRequests).toBe(0)
})

test('repayment Enter keeps the repayment', async ({ page }) => {
  test.setTimeout(90_000)
  const { repaymentTrigger } = await prepareKeyboardGroup(page)
  let deleteRequests = 0
  page.on('request', request => {
    if (request.method() === 'DELETE') deleteRequests += 1
  })

  await repaymentTrigger.click()
  const confirmation = page.getByRole('dialog', {
    name: 'Delete repayment?',
  })
  const keepRepayment = confirmation.getByRole('button', {
    name: 'Keep repayment',
  })
  await expect(keepRepayment).toBeVisible()
  await keepRepayment.focus()
  await page.keyboard.press('Enter')
  await expect(confirmation).toHaveCount(0)
  expect(deleteRequests).toBe(0)
})
