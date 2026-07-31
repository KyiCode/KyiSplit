import { expect, test } from 'vitest'
import { deleteExpense } from './expenses'
import { installFetchQueue, successResponse } from '../test/fetch'

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
