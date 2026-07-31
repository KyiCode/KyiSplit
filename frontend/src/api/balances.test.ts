import { expect, test } from 'vitest'
import { fetchBalance } from './balances'
import { installFetchQueue, successResponse } from '../test/fetch'

test('fetches deterministic group-currency balances without a request body', async () => {
  const data = {
    currency: 'SGD',
    balances: [
      { userId: 'user-1', amount: '12.30' },
      { userId: 'user-2', amount: '-12.30' },
    ],
    settlements: [{
      payerUserId: 'user-2',
      receiverUserId: 'user-1',
      amount: '12.30',
    }],
  }
  const fetchMock = installFetchQueue(successResponse(data))

  await expect(fetchBalance('group-1')).resolves.toEqual(data)
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/groups\/group-1\/getbalance$/),
    {
      credentials: 'include',
    },
  )
  expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('body')
})
