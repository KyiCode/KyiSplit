import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import AddExpensePage from '../../src/pages/AddExpensePage'
import {
  failureResponse,
  installFetchQueue,
  jsonResponse,
  successResponse,
} from '../fetch'
import { renderAt } from '../render'

test('requires payer and split totals and preserves expense values on rejection', async () => {
  const user = userEvent.setup()
  installFetchQueue(
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
