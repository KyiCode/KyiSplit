import { expect, test } from 'vitest'
import { deleteExpense, fetchExpenseDetail } from '../../src/api/expenses'
import { installFetchQueue, successResponse } from '../fetch'

test('deletes an expense on the group-and-expense scoped path', async () => {
  const fetchMock = installFetchQueue(successResponse({
    expenseId: 'expense-1',
  }))

  await expect(
    deleteExpense('group-1', 'expense-1'),
  ).resolves.toEqual({ expenseId: 'expense-1' })
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(
      /\/api\/expenses\/group-1\/expense-1$/,
    ),
    {
      credentials: 'include',
      method: 'DELETE',
    },
  )
})

test('loads saved details on the group-and-expense scoped path', async () => {
  const detail = { expense: { expenseId: 'expense-1' } }
  const fetchMock = installFetchQueue(successResponse(detail))

  await expect(
    fetchExpenseDetail('group-1', 'expense-1'),
  ).resolves.toEqual(detail)
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(
      /\/api\/expenses\/group-1\/expense-1$/,
    ),
    { credentials: 'include' },
  )
})
