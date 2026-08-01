import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from '../../src/components/Modal'

function ModalHarness({ canClose = true }: { canClose?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      {open && (
        <Modal
          ariaLabel="Test dialog"
          canClose={canClose}
          onClose={() => setOpen(false)}
        >
          <button autoFocus>Primary action</button>
          <button>Last action</button>
        </Modal>
      )}
    </>
  )
}

test('names dialogs, traps focus, closes with Escape, and restores focus', async () => {
  const user = userEvent.setup()
  render(<ModalHarness />)
  const opener = screen.getByRole('button', { name: 'Open dialog' })

  await user.click(opener)
  expect(screen.getByRole('dialog', { name: 'Test dialog' }))
    .toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Primary action' })).toHaveFocus()

  await user.tab()
  expect(screen.getByRole('button', { name: 'Last action' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'Last action' })).toHaveFocus()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})

test('contains focus and ignores Escape while closing is unsafe', async () => {
  const user = userEvent.setup()
  render(<ModalHarness canClose={false} />)
  await user.click(screen.getByRole('button', { name: 'Open dialog' }))

  expect(screen.getByRole('button', { name: 'Primary action' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog', { name: 'Test dialog' }))
    .toBeInTheDocument()

  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'Last action' })).toHaveFocus()
})
