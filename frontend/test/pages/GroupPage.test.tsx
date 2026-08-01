import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import GroupPage from '../../src/pages/GroupPage'
import {
  failureResponse,
  installFetchQueue,
  successResponse,
} from '../fetch'
import { renderAt } from '../render'

const expense = {
  expenseId: 'expense-1',
  groupId: 'group-1',
  expenseName: 'Dinner',
  expenseTotal: '12.30',
  date: '2026-07-30',
  createdAt: '2026-07-30T10:00:00.000Z',
  currency: 'USD',
}

const groupResponse = {
  groupName: 'Penang weekend',
  defaultCurrency: 'SGD',
}

const membersResponse = {
  members: [
    { userId: 'user-1', userGroupName: 'Kai' },
    { userId: 'user-2', userGroupName: 'Sam' },
    { userId: 'user-3', userGroupName: 'Jo' },
  ],
}

const balanceResponse = {
  currency: 'SGD',
  balances: [],
  settlements: [],
}

function initialResponses(
  expenses = [expense],
  balances: Response | Error = successResponse(balanceResponse),
) {
  return [
    successResponse(groupResponse),
    successResponse({ expenses }),
    successResponse(membersResponse),
    balances,
    successResponse({ repayments: [] }),
  ] as const
}

function renderGroup() {
  return renderAt(
    <Routes>
      <Route path="/group/:groupId" element={<GroupPage />} />
    </Routes>,
    '/group/group-1',
  )
}

async function openDeleteConfirmation(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', {
    name: 'View details for Dinner',
  }))
  const details = screen.getByRole('dialog', {
    name: 'Dinner expense details',
  })
  await user.click(within(details).getByRole('button', {
    name: 'Delete expense',
  }))
  return screen.getByRole('dialog', { name: 'Delete Dinner?' })
}

test('shows useful loading and empty expense states', async () => {
  installFetchQueue(...initialResponses([]))
  renderGroup()

  expect(screen.getByRole('status', {
    name: 'Loading expenses',
  })).toBeInTheDocument()
  expect(screen.getByRole('status', {
    name: 'Loading balances',
  })).toBeInTheDocument()
  expect(await screen.findByRole('heading', {
    name: 'Nothing split yet',
  })).toBeInTheDocument()
})

test('presents stored expense detail and the correction policy', async () => {
  const user = userEvent.setup()
  installFetchQueue(...initialResponses())
  renderGroup()

  await user.click(await screen.findByRole('button', {
    name: 'View details for Dinner',
  }))

  const dialog = screen.getByRole('dialog', {
    name: 'Dinner expense details',
  })
  expect(within(dialog).getByText('USD 12.30')).toBeInTheDocument()
  expect(within(dialog).getByText('30 Jul 2026')).toBeInTheDocument()
  expect(within(dialog).getByText(
    /To correct this expense, delete it and create it again/,
  )).toBeInTheDocument()
})

test('cancels confirmation with the button or Escape and keeps the row', async () => {
  const user = userEvent.setup()
  installFetchQueue(...initialResponses())
  renderGroup()

  let dialog = await openDeleteConfirmation(user)
  await user.click(within(dialog).getByRole('button', {
    name: 'Keep expense',
  }))
  expect(screen.queryByRole('dialog', {
    name: 'Delete Dinner?',
  })).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', {
    name: 'Dinner expense details',
  })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Delete expense' }))
  dialog = screen.getByRole('dialog', { name: 'Delete Dinner?' })
  expect(within(dialog).getByRole('button', {
    name: 'Delete expense',
  })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const restoredExpense = screen.getByRole('button', {
    name: 'View details for Dinner',
  })
  expect(restoredExpense).toBeInTheDocument()
  expect(restoredExpense).toHaveFocus()
})

test('disables duplicate deletion while the request is pending', async () => {
  const user = userEvent.setup()
  let resolveDelete!: (response: Response) => void
  const pendingDelete = new Promise<Response>(resolve => {
    resolveDelete = resolve
  })
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(initialResponses()[0])
    .mockResolvedValueOnce(initialResponses()[1])
    .mockResolvedValueOnce(initialResponses()[2])
    .mockResolvedValueOnce(initialResponses()[3] as Response)
    .mockResolvedValueOnce(initialResponses()[4] as Response)
    .mockImplementationOnce(() => pendingDelete)
    .mockResolvedValueOnce(successResponse({ expenses: [] }))
    .mockResolvedValueOnce(successResponse(balanceResponse))
  vi.stubGlobal('fetch', fetchMock)
  renderGroup()
  const dialog = await openDeleteConfirmation(user)

  const confirm = within(dialog).getByRole('button', {
    name: 'Delete expense',
  })
  await user.click(confirm)

  expect(within(dialog).getByRole('button', {
    name: 'Deleting expense…',
  })).toBeDisabled()
  expect(fetchMock).toHaveBeenCalledTimes(6)
  resolveDelete(successResponse({ expenseId: 'expense-1' }))
  expect(await screen.findByRole('heading', {
    name: 'Nothing split yet',
  })).toBeInTheDocument()
})

test('refreshes expenses and balances after successful deletion', async () => {
  const user = userEvent.setup()
  const fetchMock = installFetchQueue(
    ...initialResponses(),
    successResponse({ expenseId: 'expense-1' }),
    successResponse({ expenses: [] }),
    successResponse(balanceResponse),
  )
  renderGroup()
  const dialog = await openDeleteConfirmation(user)

  await user.click(within(dialog).getByRole('button', {
    name: 'Delete expense',
  }))

  expect(await screen.findByRole('heading', {
    name: 'Nothing split yet',
  })).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(fetchMock.mock.calls.map(call => String(call[0]))).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/\/api\/expenses\/group-1$/),
      expect.stringMatching(/\/api\/groups\/group-1\/getbalance$/),
    ]),
  )
})

test.each([
  [
    failureResponse('Forbidden', 403, 'FORBIDDEN'),
    'You no longer have permission to delete expenses from this group.',
  ],
  [
    failureResponse('Missing', 404, 'NOT_FOUND'),
    'That expense no longer exists. Refresh activity to sync this group.',
  ],
  [
    failureResponse('Broken', 500, 'INTERNAL_ERROR'),
    'Unable to delete this expense right now.',
  ],
])('preserves the row after a safe API rejection', async (
  rejection,
  message,
) => {
  const user = userEvent.setup()
  installFetchQueue(...initialResponses(), rejection)
  renderGroup()
  const dialog = await openDeleteConfirmation(user)

  await user.click(within(dialog).getByRole('button', {
    name: 'Delete expense',
  }))

  expect(await within(dialog).findByText(message)).toBeInTheDocument()
  expect(screen.getByRole('button', {
    name: 'View details for Dinner',
  })).toBeInTheDocument()
})

test('retries an offline deletion without removing the row early', async () => {
  const user = userEvent.setup()
  installFetchQueue(
    ...initialResponses(),
    new Error('offline'),
    successResponse({ expenseId: 'expense-1' }),
    successResponse({ expenses: [] }),
    successResponse(balanceResponse),
  )
  renderGroup()
  const dialog = await openDeleteConfirmation(user)

  await user.click(within(dialog).getByRole('button', {
    name: 'Delete expense',
  }))
  expect(await within(dialog).findByText(
    'You’re offline. Reconnect and try deleting again.',
  )).toBeInTheDocument()
  expect(screen.getByRole('button', {
    name: 'View details for Dinner',
  })).toBeInTheDocument()

  await user.click(within(dialog).getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('heading', {
    name: 'Nothing split yet',
  })).toBeInTheDocument()
})

test('renders signed balances and settlement suggestions in API order', async () => {
  installFetchQueue(...initialResponses([expense], successResponse({
    currency: 'SGD',
    balances: [
      { userId: 'user-2', amount: '-4.50' },
      { userId: 'user-1', amount: '4.50' },
      { userId: 'user-3', amount: '0.00' },
    ],
    settlements: [
      {
        payerUserId: 'user-2',
        receiverUserId: 'user-1',
        amount: '3.00',
      },
      {
        payerUserId: 'user-2',
        receiverUserId: 'user-3',
        amount: '1.50',
      },
    ],
  })))
  renderGroup()

  const balances = await screen.findByRole('region', { name: 'Balances' })
  const rows = within(balances).getAllByRole('listitem')
  expect(rows.slice(0, 3).map(row => row.textContent)).toEqual([
    expect.stringMatching(/Sam.*Owes.*SGD 4\.50/),
    expect.stringMatching(/Kai.*Should receive.*SGD 4\.50/),
    expect.stringMatching(/Jo.*Settled.*SGD 0\.00/),
  ])

  const suggestions = within(balances).getByRole('list', {
    name: 'Settlement suggestions',
  })
  expect(within(suggestions).getAllByRole('listitem')
    .map(row => row.textContent)).toEqual([
      expect.stringMatching(/Sam pays Kai.*SGD 3\.00/),
      expect.stringMatching(/Sam pays Jo.*SGD 1\.50/),
    ])
})

test('shows the zero-balance and no-settlement state', async () => {
  installFetchQueue(...initialResponses([], successResponse({
    currency: 'SGD',
    balances: membersResponse.members.map(member => ({
      userId: member.userId,
      amount: '0.00',
    })),
    settlements: [],
  })))
  renderGroup()

  const balances = await screen.findByRole('region', { name: 'Balances' })
  expect(within(balances).getAllByText('Settled')).toHaveLength(3)
  expect(within(balances).getByText('No repayments needed.'))
    .toBeInTheDocument()
})

test('shows unknown and missing members as integrity mismatches', async () => {
  installFetchQueue(...initialResponses([expense], successResponse({
    currency: 'SGD',
    balances: [
      { userId: 'user-1', amount: '2.00' },
      { userId: 'unknown-user', amount: '-2.00' },
    ],
    settlements: [{
      payerUserId: 'unknown-user',
      receiverUserId: 'user-1',
      amount: '2.00',
    }],
  })))
  renderGroup()

  const balances = await screen.findByRole('region', { name: 'Balances' })
  expect(within(balances).getByRole('alert')).toHaveTextContent(
    'Some balance data does not match the current group members.',
  )
  expect(within(balances).getAllByText(
    'Unknown member (unknown-user)',
  ).length).toBeGreaterThan(0)
  expect(within(balances).getByText('Sam')).toBeInTheDocument()
  expect(within(balances).getAllByText('Balance unavailable'))
    .toHaveLength(2)
})

test.each([
  [
    failureResponse('Forbidden', 403, 'FORBIDDEN'),
    'Balances are unavailable because you no longer have access.',
  ],
  [
    failureResponse(
      'Stored balance data is incomplete.',
      500,
      'DATA_INTEGRITY_ERROR',
    ),
    'Stored balance data is incomplete. Activity is still available.',
  ],
  [
    new Error('offline'),
    'You’re offline. Reconnect to load balances.',
  ],
])('keeps activity visible when balance loading fails', async (
  rejection,
  message,
) => {
  installFetchQueue(...initialResponses([expense], rejection))
  renderGroup()

  expect(await screen.findByRole('button', {
    name: 'View details for Dinner',
  })).toBeInTheDocument()
  const balances = screen.getByRole('region', { name: 'Balances' })
  expect(within(balances).getByText(message)).toBeInTheDocument()
})

test('retries balances independently without reordering suggestions', async () => {
  const user = userEvent.setup()
  const recovered = {
    currency: 'SGD',
    balances: membersResponse.members.map(member => ({
      userId: member.userId,
      amount: '0.00',
    })),
    settlements: [{
      payerUserId: 'user-2',
      receiverUserId: 'user-1',
      amount: '1.00',
    }, {
      payerUserId: 'user-3',
      receiverUserId: 'user-1',
      amount: '2.00',
    }],
  }
  installFetchQueue(
    ...initialResponses(
      [expense],
      failureResponse('Broken', 500, 'DATA_INTEGRITY_ERROR'),
    ),
    successResponse(recovered),
  )
  renderGroup()

  const balances = await screen.findByRole('region', { name: 'Balances' })
  await user.click(within(balances).getByRole('button', {
    name: 'Retry balances',
  }))

  const suggestions = await within(balances).findByRole('list', {
    name: 'Settlement suggestions',
  })
  expect(within(suggestions).getAllByRole('listitem')
    .map(row => row.textContent)).toEqual([
      expect.stringMatching(/Sam pays Kai.*SGD 1\.00/),
      expect.stringMatching(/Jo pays Kai.*SGD 2\.00/),
    ])
  expect(screen.getByRole('button', {
    name: 'View details for Dinner',
  })).toBeInTheDocument()
})
