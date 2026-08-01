import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import ProtectedRoute from '../src/components/ProtectedRoute'
import { installFetchQueue, successResponse } from './fetch'

function CurrentLocation() {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname}</output>
}

export function renderAt(ui: ReactElement, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
      <CurrentLocation />
    </MemoryRouter>,
  )
}

export function renderProtected(ui: ReactElement, route = '/protected') {
  const fetchMock = installFetchQueue(
    successResponse({ userId: 'user-1' }),
  )

  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path={route}
          element={<ProtectedRoute>{ui}</ProtectedRoute>}
        />
        <Route path="/auth" element={<h1>Sign in</h1>} />
      </Routes>
      <CurrentLocation />
    </MemoryRouter>,
  )

  return { ...result, fetchMock }
}
