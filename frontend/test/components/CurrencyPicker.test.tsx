import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import CurrencyPicker from '../../src/components/CurrencyPicker'
import { installFetchQueue, jsonResponse } from '../fetch'
import { renderAt } from '../render'

test('shows an explicit currency failure and retries deterministically', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn()
  installFetchQueue(
    new Error('offline'),
    jsonResponse([{ iso_code: 'EUR', name: 'Euro' }]),
  )
  renderAt(<CurrencyPicker onSelect={onSelect} />)

  expect(screen.getByRole('searchbox', { name: 'Search currencies' }))
    .toBeInTheDocument()

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to load currencies.',
  )
  expect(screen.queryByRole('button', { name: /SGD/ }))
    .not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))

  const euro = await screen.findByRole('button', { name: /EUR.*Euro/ })
  await user.click(euro)
  expect(onSelect).toHaveBeenCalledWith({
    currencyIso: 'EUR',
    currencyName: 'Euro',
  })
})
