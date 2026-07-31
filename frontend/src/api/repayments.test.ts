import { expect, test } from 'vitest'
import {
  createRepayment,
  deleteRepayment,
  fetchRepayments,
} from './repayments'
import { installFetchQueue, successResponse } from '../test/fetch'

const repayment = {
  repaymentId: 'repayment-1',
  groupId: 'group-1',
  payerUserId: 'user-1',
  receiverUserId: 'user-2',
  amount: '9.50',
  currency: 'SGD',
  repaymentDate: '2026-07-31',
  recordedByUserId: 'user-1',
  createdAt: '2026-07-31T10:00:00.000Z',
}

test('lists repayments on the group-scoped path', async () => {
  const fetchMock = installFetchQueue(successResponse({
    repayments: [repayment],
  }))

  await expect(fetchRepayments('group-1')).resolves.toEqual({
    repayments: [repayment],
  })
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/groups\/group-1\/repayments$/),
    { credentials: 'include' },
  )
})

test('creates a repayment with only the documented request body', async () => {
  const fetchMock = installFetchQueue(
    successResponse({ repayment }, 201),
  )
  const body = {
    payerUserId: 'user-1',
    receiverUserId: 'user-2',
    amount: '9.50',
    repaymentDate: '2026-07-31',
  }

  await expect(createRepayment('group-1', body)).resolves.toEqual({
    repayment,
  })
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/groups\/group-1\/repayments$/),
    {
      body: JSON.stringify(body),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  )
})

test('deletes a repayment on the group-and-repayment scoped path', async () => {
  const fetchMock = installFetchQueue(successResponse({
    repaymentId: 'repayment-1',
  }))

  await expect(
    deleteRepayment('group-1', 'repayment-1'),
  ).resolves.toEqual({ repaymentId: 'repayment-1' })
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(
      /\/api\/groups\/group-1\/repayments\/repayment-1$/,
    ),
    {
      credentials: 'include',
      method: 'DELETE',
    },
  )
})
