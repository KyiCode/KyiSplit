import { expect, type APIResponse, type Page } from '@playwright/test'
import {
  isInvitePath,
  safeRequestFailure,
} from './artifactSafety'
import {
  clearSafeDiagnostic,
  recordSafeDiagnostic,
} from './safeDiagnostics.mjs'

export { isInvitePath }

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
  const signupResponsePromise = page.waitForResponse(response => {
    try {
      return new URL(response.url()).pathname === '/api/users/signup'
    } catch {
      return false
    }
  })
  await page.getByRole('button', { name: 'Create account' }).click()
  const signupResponse = await signupResponsePromise
  if (!signupResponse.ok()) {
    const statusClass = signupResponse.status() >= 500
      ? 'journey-signup-server-error'
      : signupResponse.status() === 409
        ? 'journey-signup-conflict'
        : signupResponse.status() >= 400
          ? 'journey-signup-client-error'
          : 'journey-signup-unexpected-status'
    recordSafeDiagnostic('test-assertion', 'expectation-failed', statusClass)
  }
  recordSafeDiagnostic(
    'test-assertion',
    'expectation-failed',
    'journey-signup-ui-success',
  )
  await expect(page.getByRole('status')).toContainText('Account created')
  clearSafeDiagnostic()
}

export async function logIn(page: Page, email: string) {
  await page.goto('/auth')
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect.poll(() => page.evaluate(() => (
    (globalThis as unknown as { location: { pathname: string } }).location.pathname
  )), {
    message: 'Sign in should leave the authentication page.',
  }).not.toBe('/auth')
}

export async function expectSafePath(
  page: Page,
  pattern: RegExp,
  description: string,
) {
  await expect.poll(() => page.evaluate(() => (
    (globalThis as unknown as { location: { pathname: string } }).location.pathname
  )), { message: description }).toMatch(pattern)
}

export async function signUpAndLogIn(page: Page, email: string) {
  await signUp(page, email)
  await logIn(page, email)
}

export async function apiSignUpAndLogIn(page: Page, email: string) {
  await expectOk(await page.request.post('/api/users/signup', {
    data: { email, password: PASSWORD },
  }), 'Signup')
  await expectOk(await page.request.post('/api/users/login', {
    data: { email, password: PASSWORD },
  }), 'Login')
}

export async function apiLogOut(page: Page) {
  await expectOk(await page.request.post('/api/users/logout'), 'Logout')
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
  const payload = await expectOk(response, 'Group creation') as {
    data: { groupId: string }
  }
  return payload.data.groupId
}

export async function apiCreateInvite(page: Page, groupId: string) {
  const response = await page.request.post(`/api/groups/${groupId}/invite`)
  const payload = await expectOk(response, 'Invite creation') as {
    data: { inviteUrl: string }
  }
  expect(isInvitePath(payload.data.inviteUrl), 'Invite link format is invalid.')
    .toBe(true)
  return payload.data.inviteUrl
}

export async function chooseCurrency(page: Page, iso: string) {
  await page.getByRole('searchbox', { name: 'Search currencies' }).fill(iso)
  await page.locator('.currency-option').filter({ hasText: iso }).click()
}

async function expectOk(response: APIResponse, operation: string) {
  expect(response.ok(), safeRequestFailure(operation, response.status())).toBe(true)
  return response.json()
}
