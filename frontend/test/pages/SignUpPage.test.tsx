import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import SignUpPage from '../../src/pages/SignUpPage'
import { failureResponse, successResponse } from '../fetch'
import { renderAt } from '../render'

function renderSignup() {
  return renderAt(
    <Routes>
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/auth" element={<h1>Sign in</h1>} />
    </Routes>,
    '/signup',
  )
}

async function completeSignup(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByRole('textbox', { name: 'Email' }),
    'friend@example.com',
  )
  await user.type(screen.getByLabelText('Password'), 'password123')
}

test.each([
  ['accepts 72 ASCII bytes', 'a'.repeat(72), false],
  ['rejects 73 ASCII bytes', 'a'.repeat(73), true],
  ['accepts 72 bytes of multibyte text', '😀'.repeat(18), false],
  ['rejects 76 bytes of multibyte text', '😀'.repeat(19), true],
])('%s before making a signup request', async (_name, password, rejected) => {
  const user = userEvent.setup()
  const fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  renderSignup()
  await user.type(
    screen.getByRole('textbox', { name: 'Email' }),
    'friend@example.com',
  )
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: password },
  })

  expect(screen.getByText(/at most 72 UTF-8 bytes/i)).toBeInTheDocument()
  const button = screen.getByRole('button', { name: 'Create account' })
  if (rejected) {
    expect(button).toBeDisabled()
    await user.click(button)
    expect(fetchMock).not.toHaveBeenCalled()
  } else {
    expect(button).toBeEnabled()
  }
})

test('preserves signup values after rejection', async () => {
  const user = userEvent.setup()
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValueOnce(
    failureResponse('Account creation is temporarily unavailable.', 503),
  ))
  renderSignup()
  await completeSignup(user)

  await user.click(screen.getByRole('button', { name: 'Create account' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Account creation is temporarily unavailable.',
  )
  expect(screen.getByRole('textbox', { name: 'Email' }))
    .toHaveValue('friend@example.com')
  expect(screen.getByLabelText('Password')).toHaveValue('password123')
})

test('prevents duplicate signup and redirects while retaining an invite', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  let resolveSignup!: (response: Response) => void
  const pendingSignup = new Promise<Response>(resolve => {
    resolveSignup = resolve
  })
  const fetchMock = vi.fn<typeof fetch>()
    .mockImplementationOnce(() => pendingSignup)
  vi.stubGlobal('fetch', fetchMock)
  localStorage.setItem('pendingInvite', 'invite-123')
  renderSignup()
  await completeSignup(user)

  await user.click(screen.getByRole('button', { name: 'Create account' }))
  expect(screen.getByRole('button', { name: 'Creating account…' }))
    .toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Creating account…' }))
  expect(fetchMock).toHaveBeenCalledOnce()

  resolveSignup(successResponse({ message: 'Account created.' }, 201))
  expect(await screen.findByText('Account created. Redirecting…'))
    .toBeInTheDocument()
  await vi.advanceTimersByTimeAsync(1200)
  expect(await screen.findByRole('heading', { name: 'Sign in' }))
    .toBeInTheDocument()
  expect(localStorage.getItem('pendingInvite')).toBe('invite-123')
})
