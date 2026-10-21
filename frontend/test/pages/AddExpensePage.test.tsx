import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { vi } from 'vitest'
import AddExpensePage from '../../src/pages/AddExpensePage'
import {
  failureResponse,
  installFetchQueue,
  jsonResponse,
  successResponse,
} from '../fetch'
import { renderAt } from '../render'

function ExpenseFormNavigation() {
  const navigate = useNavigate()
  return <>
    <button onClick={() => navigate('/group/group-1')}>Close expense form</button>
    <button onClick={() => navigate('/group/group-1/addexpense')}>
      New expense
    </button>
    <Routes>
      <Route path="/group/:groupId/addexpense" element={<AddExpensePage />} />
      <Route path="/group/:groupId" element={<h1>Group activity</h1>} />
    </Routes>
  </>
}

async function withLocalTimeZone(
  timeZone: string,
  instant: string,
  run: () => Promise<void>,
) {
  vi.stubEnv('TZ', timeZone)
  vi.useFakeTimers({ now: new Date(instant) })
  try {
    await run()
  } finally {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  }
}

function oneMemberGroup() {
  return successResponse({
    groupName: 'Penang weekend',
    defaultCurrency: 'SGD',
  })
}

function oneMemberList() {
  return successResponse({
    members: [{ userId: 'user-1', userGroupName: 'Kai' }],
  })
}

test('requires payer and split totals and preserves expense values on rejection', async () => {
  const user = userEvent.setup()
  const fetchMock = installFetchQueue(
    successResponse({
      groupName: 'Penang weekend',
      defaultCurrency: 'SGD',
    }),
    successResponse({
      members: [
        { userId: 'user-1', userGroupName: 'Kai' },
        { userId: 'user-2', userGroupName: 'Sam' },
      ],
    }),
    failureResponse('Unable to save this expense.', 503),
  )
  renderAt(
    <Routes>
      <Route path="/group/:groupId/addexpense" element={<AddExpensePage />} />
    </Routes>,
    '/group/group-1/addexpense',
  )

  const addExpense = await screen.findByRole('button', {
    name: 'Add expense',
  })
  expect(addExpense).toBeDisabled()

  const description = screen.getByRole('textbox', { name: 'Description' })
  const total = screen.getByRole('spinbutton', { name: 'Total amount' })
  await user.type(description, 'Dinner')
  await user.type(total, '10.00')
  fireEvent.change(screen.getByLabelText('Date'), {
    target: { value: '2026-07-15' },
  })
  expect(screen.getByRole('button', { name: /Expense currency: SGD/ }))
    .toBeInTheDocument()
  expect(screen.getByLabelText('Date')).toHaveValue('2026-07-15')

  expect(addExpense).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Paid all for Kai' }))
  await user.click(screen.getByRole('button', { name: 'Split equally' }))
  expect(addExpense).toBeEnabled()
  await user.click(addExpense)

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to save this expense.',
  )
  expect(description).toHaveValue('Dinner')
  expect(total).toHaveValue(10)
  expect(screen.getByRole('button', { name: /Expense currency: SGD/ }))
    .toBeInTheDocument()
  expect(screen.getByRole('spinbutton', { name: 'Kai paid amount' }))
    .toHaveValue(10)
  expect(screen.getByRole('spinbutton', { name: 'Kai split amount' }))
    .toHaveValue(5)
  const createRequest = fetchMock.mock.calls[2]?.[1] as RequestInit
  expect(JSON.parse(String(createRequest.body))).toMatchObject({
    expenseDate: '2026-07-15',
  })
})

test('describes review readiness without relying on color', async () => {
  const user = userEvent.setup()
  installFetchQueue(
    successResponse({
      groupName: 'Penang weekend',
      defaultCurrency: 'SGD',
    }),
    successResponse({
      members: [{ userId: 'user-1', userGroupName: 'Kai' }],
    }),
  )
  renderAt(
    <Routes>
      <Route path="/group/:groupId/addexpense" element={<AddExpensePage />} />
    </Routes>,
    '/group/group-1/addexpense',
  )

  const readiness = await screen.findByRole('list', {
    name: 'Expense readiness',
  })
  expect(within(readiness).getByText('Details incomplete')).toBeInTheDocument()
  expect(within(readiness).getByText('Payers incomplete')).toBeInTheDocument()
  expect(within(readiness).getByText('Split incomplete')).toBeInTheDocument()

  await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Dinner')
  await user.type(screen.getByRole('spinbutton', { name: 'Total amount' }), '10')
  await user.click(screen.getByRole('button', { name: 'Paid all for Kai' }))
  await user.click(screen.getByRole('button', { name: 'Split equally' }))

  expect(within(readiness).getByText('Details complete')).toBeInTheDocument()
  expect(within(readiness).getByText('Payers complete')).toBeInTheDocument()
  expect(within(readiness).getByText('Split complete')).toBeInTheDocument()
})

test('defaults to group currency and permits another supported source currency', async () => {
  const user = userEvent.setup()
  installFetchQueue(
    successResponse({
      groupName: 'Tokyo weekend',
      defaultCurrency: 'JPY',
    }),
    successResponse({
      members: [{ userId: 'user-1', userGroupName: 'Kai' }],
    }),
    jsonResponse([
      { iso_code: 'JPY', name: 'Japanese Yen' },
      { iso_code: 'USD', name: 'US Dollar' },
    ]),
  )
  renderAt(
    <Routes>
      <Route path="/group/:groupId/addexpense" element={<AddExpensePage />} />
    </Routes>,
    '/group/group-1/addexpense',
  )

  expect(await screen.findByRole('button', { name: /Expense currency: JPY/ }))
    .toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Expense currency: JPY/ }))
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', {
    name: /USD.*US Dollar/,
  }))
  expect(screen.getByRole('button', { name: /Expense currency: USD/ }))
    .toBeInTheDocument()
})

test('prevents duplicate expense creation while the request is pending', async () => {
  const user = userEvent.setup()
  let resolveCreate!: (response: Response) => void
  const pendingCreate = new Promise<Response>(resolve => {
    resolveCreate = resolve
  })
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(successResponse({
      groupName: 'Penang weekend',
      defaultCurrency: 'SGD',
    }))
    .mockResolvedValueOnce(successResponse({
      members: [{ userId: 'user-1', userGroupName: 'Kai' }],
    }))
    .mockImplementationOnce(() => pendingCreate)
  vi.stubGlobal('fetch', fetchMock)
  renderAt(
    <Routes>
      <Route path="/group/:groupId/addexpense" element={<AddExpensePage />} />
      <Route path="/group/:groupId" element={<h1>Group activity</h1>} />
    </Routes>,
    '/group/group-1/addexpense',
  )

  await user.type(
    await screen.findByRole('textbox', { name: 'Description' }),
    'Dinner',
  )
  await user.type(
    screen.getByRole('spinbutton', { name: 'Total amount' }),
    '10.00',
  )
  await user.click(screen.getByRole('button', { name: 'Paid all for Kai' }))
  await user.click(screen.getByRole('button', { name: 'Split equally' }))
  await user.click(screen.getByRole('button', { name: 'Add expense' }))

  const pendingButton = screen.getByRole('button', { name: 'Adding expense…' })
  expect(pendingButton).toBeDisabled()
  await user.click(pendingButton)
  expect(fetchMock).toHaveBeenCalledTimes(3)

  resolveCreate(successResponse({ expenseId: 'expense-1' }, 201))
  expect(await screen.findByRole('heading', { name: 'Group activity' }))
    .toBeInTheDocument()
})

test('defaults to the Singapore local date before 08:00', async () => {
  installFetchQueue(oneMemberGroup(), oneMemberList())
  await withLocalTimeZone('Asia/Singapore', '2026-06-30T23:30:00.000Z', async () => {
    renderAt(
      <Routes>
        <Route path="/group/:groupId/addexpense" element={<AddExpensePage />} />
      </Routes>,
      '/group/group-1/addexpense',
    )

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByLabelText('Date')).toHaveValue('2026-07-01')
  })
})

test('defaults to the local date in a timezone behind UTC', async () => {
  installFetchQueue(oneMemberGroup(), oneMemberList())
  await withLocalTimeZone('America/Los_Angeles', '2026-07-01T05:30:00.000Z', async () => {
    renderAt(
      <Routes>
        <Route path="/group/:groupId/addexpense" element={<AddExpensePage />} />
      </Routes>,
      '/group/group-1/addexpense',
    )

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByLabelText('Date')).toHaveValue('2026-06-30')
  })
})

test('uses the new local date when reopening the expense form after midnight', async () => {
  installFetchQueue(
    oneMemberGroup(),
    oneMemberList(),
    oneMemberGroup(),
    oneMemberList(),
  )
  await withLocalTimeZone('Asia/Singapore', '2026-07-01T15:59:00.000Z', async () => {
    renderAt(<ExpenseFormNavigation />, '/group/group-1/addexpense')
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByLabelText('Date')).toHaveValue('2026-07-01')

    fireEvent.click(screen.getByRole('button', { name: 'Close expense form' }))
    vi.setSystemTime(new Date('2026-07-01T16:00:00.000Z'))
    fireEvent.click(screen.getByRole('button', { name: 'New expense' }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByLabelText('Date')).toHaveValue('2026-07-02')
  })
})
