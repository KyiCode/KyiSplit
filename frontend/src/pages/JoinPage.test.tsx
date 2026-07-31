import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import JoinPage from './JoinPage'
import {
  failureResponse,
  installFetchQueue,
  successResponse,
} from '../test/fetch'
import { renderAt } from '../test/render'

test('saves an invitation while an anonymous user creates an account', async () => {
  const user = userEvent.setup()
  installFetchQueue(
    failureResponse('Sign in required.', 401, 'UNAUTHENTICATED'),
  )
  renderAt(
    <Routes>
      <Route path="/join/:inviteToken" element={<JoinPage />} />
      <Route path="/signup" element={<h1>Create account</h1>} />
    </Routes>,
    '/join/invite-123',
  )

  await user.click(await screen.findByRole('button', {
    name: 'Create an account',
  }))

  expect(localStorage.getItem('pendingInvite')).toBe('invite-123')
  expect(screen.getByLabelText('Current location')).toHaveTextContent(
    '/signup',
  )
})

test.each([
  [
    failureResponse('Expired', 410, 'INVITE_EXPIRED'),
    'This invite has expired. Ask a group member for a new link.',
  ],
  [
    failureResponse('Missing', 404, 'INVITE_NOT_FOUND'),
    'This invite link is not valid. Check that you copied the whole link.',
  ],
])('distinguishes unusable invitation links', async (rejection, message) => {
  const user = userEvent.setup()
  installFetchQueue(
    successResponse({ userId: 'user-1' }),
    rejection,
  )
  localStorage.setItem('pendingInvite', 'invite-123')
  renderAt(
    <Routes>
      <Route path="/join/:inviteToken" element={<JoinPage />} />
    </Routes>,
    '/join/invite-123',
  )

  await user.type(
    await screen.findByRole('textbox', { name: 'Your name in this group' }),
    'Kai',
  )
  await user.click(screen.getByRole('button', { name: 'Join group' }))

  expect(await screen.findByText(message)).toBeInTheDocument()
  expect(localStorage.getItem('pendingInvite')).toBeNull()
  expect(screen.getByRole('button', { name: 'Join group' })).toBeDisabled()
})

test('allows the same reusable invitation in distinct authenticated sessions', async () => {
  const fetchMock = installFetchQueue(
    successResponse({ userId: 'user-1' }),
    successResponse({ groupId: 'group-1' }),
    successResponse({ userId: 'user-2' }),
    successResponse({ groupId: 'group-1' }),
  )

  async function joinAs(name: string) {
    const user = userEvent.setup()
    const view = renderAt(
      <Routes>
        <Route path="/join/:inviteToken" element={<JoinPage />} />
        <Route path="/group/:groupId" element={<h1>Joined group</h1>} />
      </Routes>,
      '/join/reusable-token',
    )
    await user.type(
      await screen.findByRole('textbox', {
        name: 'Your name in this group',
      }),
      name,
    )
    await user.click(screen.getByRole('button', { name: 'Join group' }))
    expect(await screen.findByRole('heading', { name: 'Joined group' }))
      .toBeInTheDocument()
    view.unmount()
  }

  await joinAs('Kai')
  await joinAs('Sam')

  expect(fetchMock.mock.calls[1]?.[0]).toMatch(/join\/reusable-token$/)
  expect(fetchMock.mock.calls[3]?.[0]).toMatch(/join\/reusable-token$/)
})

test('prevents duplicate join requests while one is pending', async () => {
  const user = userEvent.setup()
  let resolveJoin!: (response: Response) => void
  const pendingJoin = new Promise<Response>(resolve => {
    resolveJoin = resolve
  })
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(successResponse({ userId: 'user-1' }))
    .mockImplementationOnce(() => pendingJoin)
  vi.stubGlobal('fetch', fetchMock)
  renderAt(
    <Routes>
      <Route path="/join/:inviteToken" element={<JoinPage />} />
      <Route path="/group/:groupId" element={<h1>Joined group</h1>} />
    </Routes>,
    '/join/invite-123',
  )

  await user.type(
    await screen.findByRole('textbox', { name: 'Your name in this group' }),
    'Kai',
  )
  await user.click(screen.getByRole('button', { name: 'Join group' }))
  const pendingButton = screen.getByRole('button', { name: 'Joining…' })
  expect(pendingButton).toBeDisabled()
  await user.click(pendingButton)
  expect(fetchMock).toHaveBeenCalledTimes(2)

  resolveJoin(successResponse({ groupId: 'group-1' }))
  expect(await screen.findByRole('heading', { name: 'Joined group' }))
    .toBeInTheDocument()
})
