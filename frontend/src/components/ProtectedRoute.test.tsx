import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import LogInPage from '../pages/LogInPage'
import {
  failureResponse,
  installFetchQueue,
  successResponse,
} from '../test/fetch'
import { renderAt } from '../test/render'

function PrivatePage() {
  const location = useLocation()
  return <h1>Private page {location.search}</h1>
}

test('restores the requested protected path after authentication', async () => {
  const user = userEvent.setup()
  installFetchQueue(
    failureResponse('Sign in required.', 401, 'UNAUTHENTICATED'),
    successResponse({
      user: { userId: 'user-1', email: 'friend@example.com' },
    }),
    successResponse({ userId: 'user-1' }),
  )
  renderAt(
    <Routes>
      <Route
        path="/private"
        element={<ProtectedRoute><PrivatePage /></ProtectedRoute>}
      />
      <Route path="/auth" element={<LogInPage />} />
    </Routes>,
    '/private?tab=balances',
  )

  expect(await screen.findByRole('heading', { name: 'Sign in' }))
    .toBeInTheDocument()
  await user.type(
    screen.getByRole('textbox', { name: 'Email' }),
    'friend@example.com',
  )
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByRole('heading', {
    name: 'Private page ?tab=balances',
  })).toBeInTheDocument()
})

test('retries when session verification is temporarily unavailable', async () => {
  const user = userEvent.setup()
  installFetchQueue(
    new Error('offline'),
    successResponse({ userId: 'user-1' }),
  )
  renderAt(
    <Routes>
      <Route
        path="/private"
        element={<ProtectedRoute><h1>Private page</h1></ProtectedRoute>}
      />
    </Routes>,
    '/private',
  )

  expect(await screen.findByText('Unable to check your session.'))
    .toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('heading', { name: 'Private page' }))
    .toBeInTheDocument()
})
