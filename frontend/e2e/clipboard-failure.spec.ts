import { expect, test } from '@playwright/test'
import { apiCreateGroup, apiSignUpAndLogIn, uniqueEmail } from './helpers'

test('clipboard denial gives a manual copy fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException('Clipboard access denied.', 'NotAllowedError')
        },
      },
    })
  })
  await apiSignUpAndLogIn(page, uniqueEmail('clipboard-owner'))
  const groupId = await apiCreateGroup(page, 'Clipboard check', 'Alex', 'USD')
  await page.goto(`/group/${groupId}`)
  await page.getByRole('button', { name: 'Invite people' }).click()
  await expect(page.locator('.invite-banner p')).toBeVisible()
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Select and copy the invite link manually.',
  )
})
