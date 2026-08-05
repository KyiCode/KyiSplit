import { expect, type APIResponse, type Page } from '@playwright/test'

let sequence = 0

export function uniqueEmail(prefix: string) {
  sequence += 1
  return `${prefix}-${Date.now()}-${sequence}@example.test`
}

export const PASSWORD = 'correct horse battery staple'

export async function installCurrencyFixture(page: Page) {
  await page.route('https://api.frankfurter.dev/v2/currencies', route => (
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        { iso_code: 'SGD', name: 'Singapore Dollar' },
        { iso_code: 'USD', name: 'United States Dollar' },
      ]),
    })
  ))
}

export async function signUp(page: Page, email: string) {
  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('status')).toContainText('Account created')
}

export async function logIn(page: Page, email: string) {
  await page.goto('/auth')
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/auth$/)
}

export async function signUpAndLogIn(page: Page, email: string) {
  await signUp(page, email)
  await logIn(page, email)
}

export async function apiSignUpAndLogIn(page: Page, email: string) {
  await expectOk(await page.request.post('/api/users/signup', {
    data: { email, password: PASSWORD },
  }))
  await expectOk(await page.request.post('/api/users/login', {
    data: { email, password: PASSWORD },
  }))
}

export async function apiLogOut(page: Page) {
  await expectOk(await page.request.post('/api/users/logout'))
}

export async function apiCreateGroup(
  page: Page,
  groupName: string,
  groupUserName: string,
  defaultCurrency = 'USD',
) {
  const response = await page.request.post('/api/groups/addgroup', {
    data: { groupName, groupUserName, defaultCurrency },
  })
  const payload = await expectOk(response) as {
    data: { groupId: string }
  }
  return payload.data.groupId
}

export async function apiCreateInvite(page: Page, groupId: string) {
  const response = await page.request.post(`/api/groups/${groupId}/invite`)
  const payload = await expectOk(response) as {
    data: { inviteUrl: string }
  }
  return payload.data.inviteUrl
}

export async function chooseCurrency(page: Page, iso: string) {
  await page.getByRole('searchbox', { name: 'Search currencies' }).fill(iso)
  await page.locator('.currency-option').filter({ hasText: iso }).click()
}

async function expectOk(response: APIResponse) {
  expect(response.ok(), await response.text()).toBe(true)
  return response.json()
}
