import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MainPage from './MainPage'
import PageShell from '../components/PageShell'
import { fetchGroups } from '../api/groups'
import {
  failureResponse,
  installFetchQueue,
  jsonResponse,
  successResponse,
} from '../test/fetch'
import { renderAt } from '../test/render'

const emptyGroups = {
  userId: 'user-1',
  groups: [],
}

function UnauthorizedTrigger() {
  return (
    <PageShell>
      <button onClick={() => void fetchGroups().catch(() => undefined)}>
        Load groups
      </button>
    </PageShell>
  )
}

test('global 401 handling navigates an authenticated page to sign-in', async () => {
  const user = userEvent.setup()
  installFetchQueue(
    failureResponse('Your session expired.', 401, 'UNAUTHENTICATED'),
  )
  renderAt(<UnauthorizedTrigger />, '/group/group-1')

  await user.click(screen.getByRole('button', { name: 'Load groups' }))
  expect(screen.getByLabelText('Current location')).toHaveTextContent(
    '/auth',
  )
})

test('submits the chosen group currency and preserves values on rejection', async () => {
  const user = userEvent.setup()
  const fetchMock = installFetchQueue(
    successResponse(emptyGroups),
    jsonResponse([{ iso_code: 'SGD', name: 'Singapore dollar' }]),
    failureResponse('Unable to create this group.', 503),
  )
  renderAt(<MainPage />)

  expect(screen.getByRole('status', { name: 'Loading groups' }))
    .toBeInTheDocument()

  await user.click(await screen.findByRole('button', {
    name: /Start a new group/,
  }))
  const groupName = screen.getByRole('textbox', { name: 'Group name' })
  const memberName = screen.getByRole('textbox', {
    name: 'Your name in this group',
  })
  await user.type(groupName, 'Penang weekend')
  await user.type(memberName, 'Kai')
  expect(screen.getByRole('button', { name: 'Create group' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Choose group currency' }))

  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', {
    name: /SGD.*Singapore dollar/,
  }))
  await user.click(screen.getByRole('button', { name: 'Create group' }))

  expect(await screen.findByText('Unable to create this group.'))
    .toBeInTheDocument()
  expect(groupName).toHaveValue('Penang weekend')
  expect(memberName).toHaveValue('Kai')
  expect(screen.getByRole('button', {
    name: /SGD.*Singapore dollar/,
  })).toBeInTheDocument()

  const request = fetchMock.mock.calls[2]?.[1] as RequestInit
  expect(JSON.parse(String(request.body))).toEqual({
    groupName: 'Penang weekend',
    groupUserName: 'Kai',
    defaultCurrency: 'SGD',
  })
})

test('displays the selected currency after creating a group', async () => {
  const user = userEvent.setup()
  installFetchQueue(
    successResponse(emptyGroups),
    jsonResponse([{ iso_code: 'USD', name: 'US Dollar' }]),
    successResponse({
      groupId: 'group-1',
      message: 'Group created.',
      defaultCurrency: 'USD',
    }, 201),
    successResponse({
      userId: 'user-1',
      groups: [{
        groupId: 'group-1',
        groupName: 'New York weekend',
        defaultCurrency: 'USD',
        groupMembers: [{ userId: 'user-1', userGroupName: 'Kai' }],
      }],
    }),
  )
  renderAt(<MainPage />)

  await user.click(await screen.findByRole('button', {
    name: /Start a new group/,
  }))
  await user.type(
    screen.getByRole('textbox', { name: 'Group name' }),
    'New York weekend',
  )
  await user.type(
    screen.getByRole('textbox', { name: 'Your name in this group' }),
    'Kai',
  )
  await user.click(screen.getByRole('button', { name: 'Choose group currency' }))
  await user.click(await screen.findByRole('button', {
    name: /USD.*US Dollar/,
  }))
  await user.click(screen.getByRole('button', { name: 'Create group' }))

  const group = await screen.findByRole('button', {
    name: /New York weekend/,
  })
  expect(group).toHaveTextContent('USD')
})

test('logs out once and clears invitation continuation', async () => {
  const user = userEvent.setup()
  let resolveLogout!: (response: Response) => void
  const pendingLogout = new Promise<Response>(resolve => {
    resolveLogout = resolve
  })
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(successResponse(emptyGroups))
    .mockImplementationOnce(() => pendingLogout)
  vi.stubGlobal('fetch', fetchMock)
  localStorage.setItem('pendingInvite', 'invite-123')
  renderAt(<MainPage />)

  await user.click(await screen.findByRole('button', { name: 'Sign out' }))
  const pendingButton = screen.getByRole('button', { name: 'Signing out…' })
  expect(pendingButton).toBeDisabled()
  await user.click(pendingButton)
  expect(fetchMock).toHaveBeenCalledTimes(2)

  resolveLogout(successResponse({}))
  expect(await screen.findByLabelText('Current location'))
    .toHaveTextContent('/auth')
  expect(localStorage.getItem('pendingInvite')).toBeNull()
})

test('prevents duplicate group creation while the request is pending', async () => {
  const user = userEvent.setup()
  let resolveCreate!: (response: Response) => void
  const pendingCreate = new Promise<Response>(resolve => {
    resolveCreate = resolve
  })
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(successResponse(emptyGroups))
    .mockResolvedValueOnce(jsonResponse([
      { iso_code: 'SGD', name: 'Singapore dollar' },
    ]))
    .mockImplementationOnce(() => pendingCreate)
    .mockResolvedValueOnce(successResponse(emptyGroups))
  vi.stubGlobal('fetch', fetchMock)
  renderAt(<MainPage />)

  await user.click(await screen.findByRole('button', {
    name: /Start a new group/,
  }))
  await user.type(
    screen.getByRole('textbox', { name: 'Group name' }),
    'Penang weekend',
  )
  await user.type(
    screen.getByRole('textbox', { name: 'Your name in this group' }),
    'Kai',
  )
  await user.click(screen.getByRole('button', { name: 'Choose group currency' }))
  await user.click(await screen.findByRole('button', {
    name: /SGD.*Singapore dollar/,
  }))
  await user.click(screen.getByRole('button', { name: 'Create group' }))

  const pendingButton = screen.getByRole('button', { name: 'Creating…' })
  expect(pendingButton).toBeDisabled()
  await user.click(pendingButton)
  expect(fetchMock).toHaveBeenCalledTimes(3)

  resolveCreate(successResponse({
    groupId: 'group-1',
    message: 'Group created.',
    defaultCurrency: 'SGD',
  }, 201))
  expect(await screen.findByRole('button', { name: /Start a new group/ }))
    .toBeInTheDocument()
})
