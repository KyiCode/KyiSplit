import { describe, expect, it } from 'vitest'
import {
  isInvitePath,
  safeFailureSummary,
  safeRequestFailure,
  SAFE_BROWSER_ARTIFACT_OPTIONS,
} from '../../e2e/artifactSafety'

describe('browser artifact safety', () => {
  it('disables browser state capture by default', () => {
    expect(SAFE_BROWSER_ARTIFACT_OPTIONS).toEqual({
      screenshot: 'off',
      trace: 'off',
      video: 'off',
    })
  })

  it('keeps request failure diagnostics to operation and status', () => {
    const token = 'a'.repeat(64)
    const sensitiveBody = [
      'password=correct horse battery staple',
      'Cookie: session=secret-cookie-value',
      'Authorization: Bearer secret-jwt-value',
      `https://example.test/join/${token}`,
    ].join(' ')
    const diagnostic = safeRequestFailure('Invite creation', 500)

    expect(diagnostic).toBe('Invite creation failed (HTTP 500).')
    for (const sensitiveValue of [
      'correct horse battery staple',
      'secret-cookie-value',
      'secret-jwt-value',
      token,
      sensitiveBody,
    ]) {
      expect(diagnostic).not.toContain(sensitiveValue)
    }
  })

  it('summarizes failed browser tests without retaining error details', () => {
    const token = 'b'.repeat(64)
    const failureDetails = [
      'page.goto failed',
      `https://example.test/join/${token}`,
      'password: correct horse battery staple',
      'Cookie: session=secret-cookie-value',
    ].join(' ')
    const diagnostic = safeFailureSummary(
      'expired invitation is rejected',
      1,
      failureDetails,
    )

    expect(diagnostic).toBe(
      'FAILED: expired invitation is rejected (attempt 2; browser details suppressed).',
    )
    expect(diagnostic).not.toContain(token)
    expect(diagnostic).not.toContain('correct horse battery staple')
    expect(diagnostic).not.toContain('secret-cookie-value')
    const unsafeTitle = safeFailureSummary(
      `invitation route ${token} https://example.test/join/${token}`,
      0,
      failureDetails,
    )
    expect(unsafeTitle).not.toContain(token)
    expect(unsafeTitle).not.toContain('https://example.test')
  })

  it('validates invite paths without exposing the token in assertions', () => {
    const token = 'c'.repeat(64)
    expect(isInvitePath(`https://example.test/join/${token}`)).toBe(true)
    expect(isInvitePath('https://example.test/join/not-a-token')).toBe(false)
    expect(isInvitePath('not a URL')).toBe(false)
  })
})
