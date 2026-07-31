import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import RepaymentPanel from './RepaymentPanel'
import {
  failureResponse,
  installFetchQueue,
  successResponse,
} from '../test/fetch'

const members = [
  { userId: 'user-1', userGroupName: 'Kai' },
  { userId: 'user-2', userGroupName: 'Sam' },
  { userId: 'user-3', userGroupName: 'Jo' },
]

const repayment = {
  repaymentId: 'repayment-1',
  groupId: 'group-1',
  payerUserId: 'user-2',
  receiverUserId: 'user-1',
  amount: '9.50',
  currency: 'SGD',
  repaymentDate: '2026-07-30',
  recordedByUserId: 'user-3',
  createdAt: '2026-07-30T10:00:00.000Z',
}

function renderPanel(onBalancesChanged = vi.fn()) {
  render(
    <RepaymentPanel
      groupId="group-1"
      currency="SGD"
      members={members}
      onBalancesChanged={onBalancesChanged}
    />,
  )
  return onBalancesChanged
}

async function completeForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole('combobox', {
    name: 'Payer',
  }), 'user-2')
  await user.selectOptions(screen.getByRole('combobox', {
    name: 'Receiver',
  }), 'user-1')
  await user.type(screen.getByRole('spinbutton', { name: 'Amount' }), '9.50')
  fireEvent.change(screen.getByLabelText('Repayment date'), {
    target: { value: '2026-07-30' },
  })
}

test('shows loading and empty repayment history states', async () => {
  installFetchQueue(successResponse({ repayments: [] }))
  renderPanel()

  expect(screen.getByRole('status', {
    name: 'Loading repayments',
  })).toBeInTheDocument()
  expect(await screen.findByText('No repayments recorded yet.'))
    .toBeInTheDocument()
})

test('renders newest-first history with member names and recorder', async () => {
  const older = {
    ...repayment,
    repaymentId: 'repayment-older',
    payerUserId: 'user-1',
    receiverUserId: 'user-3',
    amount: '2.00',
    repaymentDate: '2026-07-29',
  }
  installFetchQueue(successResponse({ repayments: [repayment, older] }))
  renderPanel()

  const history = await screen.findByRole('list', {
    name: 'Repayment history',
  })
  expect(within(history).getAllByRole('listitem').map(row => row.textContent))
    .toEqual([
      expect.stringMatching(/Sam paid Kai.*30 Jul 2026.*Recorded by Jo.*SGD 9\.50/),
      expect.stringMatching(/Kai paid Jo.*29 Jul 2026.*Recorded by Jo.*SGD 2\.00/),
    ])
})

test('requires valid distinct members, money, and calendar date', async () => {
  const user = userEvent.setup()
  installFetchQueue(successResponse({ repayments: [] }))
  renderPanel()
  await screen.findByText('No repayments recorded yet.')

  const submit = screen.getByRole('button', { name: 'Record repayment' })
  expect(submit).toBeDisabled()
  expect(screen.getByText('SGD', { selector: '.repayment-currency' }))
    .toBeInTheDocument()
  expect(screen.queryByRole('combobox', { name: /currency/i }))
    .not.toBeInTheDocument()

  await user.selectOptions(screen.getByRole('combobox', {
    name: 'Payer',
  }), 'user-1')
  await user.selectOptions(screen.getByRole('combobox', {
    name: 'Receiver',
  }), 'user-1')
  await user.type(screen.getByRole('spinbutton', { name: 'Amount' }), '1.001')
  fireEvent.change(screen.getByLabelText('Repayment date'), {
    target: { value: 'not-a-date' },
  })
  expect(submit).toBeDisabled()

  await user.selectOptions(screen.getByRole('combobox', {
    name: 'Receiver',
  }), 'user-2')
  await user.clear(screen.getByRole('spinbutton', { name: 'Amount' }))
  await user.type(screen.getByRole('spinbutton', { name: 'Amount' }), '1.25')
  fireEvent.change(screen.getByLabelText('Repayment date'), {
    target: { value: '2026-07-30' },
  })
  expect(submit).toBeEnabled()
})

test('keeps entered values and prevents duplicate create submission', async () => {
  const user = userEvent.setup()
  let rejectCreate!: (error: Error) => void
  const pendingCreate = new Promise<Response>((_resolve, reject) => {
    rejectCreate = reject
  })
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(successResponse({ repayments: [] }))
    .mockImplementationOnce(() => pendingCreate)
  vi.stubGlobal('fetch', fetchMock)
  renderPanel()
  await completeForm(user)

  await user.click(screen.getByRole('button', { name: 'Record repayment' }))
  expect(screen.getByRole('button', {
    name: 'Recording repayment…',
  })).toBeDisabled()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  rejectCreate(new Error('offline'))

  expect(await screen.findByText(
    'You’re offline. Reconnect and try recording again.',
  )).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Payer' })).toHaveValue('user-2')
  expect(screen.getByRole('spinbutton', { name: 'Amount' })).toHaveValue(9.5)
})

test('refreshes history and balances after creating a repayment', async () => {
  const user = userEvent.setup()
  const onBalancesChanged = vi.fn()
  installFetchQueue(
    successResponse({ repayments: [] }),
    successResponse({ repayment }, 201),
    successResponse({ repayments: [repayment] }),
  )
  renderPanel(onBalancesChanged)
  await completeForm(user)

  await user.click(screen.getByRole('button', { name: 'Record repayment' }))

  expect(await screen.findByText(/Sam paid Kai/)).toBeInTheDocument()
  expect(onBalancesChanged).toHaveBeenCalledOnce()
  expect(screen.getByRole('combobox', { name: 'Payer' })).toHaveValue('')
})

test('requires confirmation and refreshes after deleting a repayment', async () => {
  const user = userEvent.setup()
  const onBalancesChanged = vi.fn()
  installFetchQueue(
    successResponse({ repayments: [repayment] }),
    successResponse({ repaymentId: 'repayment-1' }),
    successResponse({ repayments: [] }),
  )
  renderPanel(onBalancesChanged)

  await user.click(await screen.findByRole('button', {
    name: 'Delete repayment from Sam to Kai',
  }))
  const dialog = screen.getByRole('dialog', { name: 'Delete repayment?' })
  expect(screen.getByText(/Sam paid Kai/)).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', {
    name: 'Delete repayment',
  }))

  expect(await screen.findByText('No repayments recorded yet.'))
    .toBeInTheDocument()
  expect(onBalancesChanged).toHaveBeenCalledOnce()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test.each([
  [
    failureResponse('Forbidden', 403, 'FORBIDDEN'),
    'You no longer have permission to delete repayments from this group.',
  ],
  [
    failureResponse('Missing', 404, 'NOT_FOUND'),
    'That repayment no longer exists. Refresh history to sync this group.',
  ],
  [
    failureResponse('Broken', 500, 'INTERNAL_ERROR'),
    'Unable to delete this repayment right now.',
  ],
])('preserves history after a safe delete rejection', async (
  rejection,
  message,
) => {
  const user = userEvent.setup()
  installFetchQueue(successResponse({ repayments: [repayment] }), rejection)
  renderPanel()

  await user.click(await screen.findByRole('button', {
    name: 'Delete repayment from Sam to Kai',
  }))
  const dialog = screen.getByRole('dialog', { name: 'Delete repayment?' })
  await user.click(within(dialog).getByRole('button', {
    name: 'Delete repayment',
  }))

  expect(await within(dialog).findByText(message)).toBeInTheDocument()
  expect(screen.getByText(/Sam paid Kai/)).toBeInTheDocument()
})

test('retries offline history loading and exposes member integrity issues', async () => {
  const user = userEvent.setup()
  installFetchQueue(
    new Error('offline'),
    successResponse({
      repayments: [{
        ...repayment,
        payerUserId: 'unknown-user',
      }],
    }),
  )
  renderPanel()

  expect(await screen.findByText(
    'You’re offline. Reconnect to load repayment history.',
  )).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Retry repayments' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Some repayments do not match the current group members.',
  )
  expect(screen.getByText(/Unknown member \(unknown-user\) paid Kai/))
    .toBeInTheDocument()
})
