import { screen } from '@testing-library/react'
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
