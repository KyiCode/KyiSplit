import { screen } from '@testing-library/react'
import { renderProtected } from './render'

test('renders an authenticated page without a database connection', async () => {
  renderProtected(<h1>Your groups</h1>)

  expect(await screen.findByRole('heading', { name: 'Your groups' }))
    .toBeInTheDocument()
  expect(screen.getByLabelText('Current location')).toHaveTextContent(
    '/protected',
  )
})
