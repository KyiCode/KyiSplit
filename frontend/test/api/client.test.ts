import { expect, test, vi } from 'vitest'
import { fetchBalance } from '../../src/api/balances'
import { ApiError } from '../../src/api/client'
import {
  failureResponse,
  installFetchQueue,
  jsonResponse,
} from '../fetch'

test('preserves coded API failures', async () => {
  installFetchQueue(
    failureResponse('Group access denied.', 403, 'FORBIDDEN'),
  )

  await expect(fetchBalance('group-1')).rejects.toMatchObject({
    name: 'ApiError',
    message: 'Group access denied.',
    status: 403,
    code: 'FORBIDDEN',
  } satisfies Partial<ApiError>)
})

test('dispatches the global unauthorized event for helper requests', async () => {
  const unauthorized = vi.fn()
  window.addEventListener('kyisplit:unauthorized', unauthorized)
  installFetchQueue(
    failureResponse('Sign in required.', 401, 'UNAUTHENTICATED'),
  )

  await expect(fetchBalance('group-1')).rejects.toMatchObject({
    status: 401,
    code: 'UNAUTHENTICATED',
  })
  expect(unauthorized).toHaveBeenCalledOnce()
  window.removeEventListener('kyisplit:unauthorized', unauthorized)
})

test('rejects a malformed success envelope', async () => {
  installFetchQueue(jsonResponse({
    status: 'success',
    balances: [],
  }))

  await expect(fetchBalance('group-1')).rejects.toMatchObject({
    status: 502,
    code: 'INTERNAL_ERROR',
    message: 'KyiSplit returned an invalid response.',
  })
})
