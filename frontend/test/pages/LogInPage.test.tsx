import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import LogInPage from '../../src/pages/LogInPage'
import {
  failureResponse,
  installFetchQueue,
  successResponse,
} from '../fetch'
import { renderAt } from '../render'

function renderLogin() {
  return renderAt(
    <Routes>
      <Route path="/auth" element={<LogInPage />} />
      <Route path="/join/:inviteToken" element={<h1>Invitation</h1>} />
      <Route path="/" element={<h1>Groups</h1>} />
    </Routes>,
    '/auth',
  )
}

test('keeps sign-in values after a recoverable rejection', async () => {
  const user = userEvent.setup()
  installFetchQueue(
    failureResponse('Sign in is temporarily unavailable.', 503),
  )
  renderLogin()

  const email = screen.getByRole('textbox', { name: 'Email' })
  const password = screen.getByLabelText('Password')
  await user.type(email, 'friend@example.com')
  await user.type(password, 'correct horse battery staple')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Sign in is temporarily unavailable.',
  )
  expect(email).toHaveValue('friend@example.com')
  expect(password).toHaveValue('correct horse battery staple')
})

test('continues to a saved invitation after sign-in', async () => {
  const user = userEvent.setup()
  localStorage.setItem('pendingInvite', 'invite-123')
  const fetchMock = installFetchQueue(successResponse({
    user: { userId: 'user-1', email: 'friend@example.com' },
  }))
  renderLogin()

  await user.type(
    screen.getByRole('textbox', { name: 'Email' }),
    'friend@example.com',
  )
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByRole('heading', { name: 'Invitation' }))
    .toBeInTheDocument()
  expect(screen.getByLabelText('Current location')).toHaveTextContent(
    '/join/invite-123',
  )
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/users\/login$/),
    expect.objectContaining({ credentials: 'include', method: 'POST' }),
  )
})

test('prevents duplicate sign-in while authentication is pending', async () => {
  const user = userEvent.setup()
  let resolveLogin!: (response: Response) => void
  const pendingLogin = new Promise<Response>(resolve => {
    resolveLogin = resolve
  })
  const fetchMock = vi.fn<typeof fetch>()
    .mockImplementationOnce(() => pendingLogin)
  vi.stubGlobal('fetch', fetchMock)
  renderLogin()

  await user.type(
    screen.getByRole('textbox', { name: 'Email' }),
    'friend@example.com',
  )
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))

  const pendingButton = screen.getByRole('button', { name: 'Signing in…' })
  expect(pendingButton).toBeDisabled()
  await user.click(pendingButton)
  expect(fetchMock).toHaveBeenCalledOnce()
  resolveLogin(successResponse({
    user: { userId: 'user-1', email: 'friend@example.com' },
  }))
  expect(await screen.findByRole('heading', { name: 'Groups' }))
    .toBeInTheDocument()
})
