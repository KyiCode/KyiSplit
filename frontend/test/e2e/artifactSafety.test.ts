import { describe, expect, it } from 'vitest'
import {
  isInvitePath,
  parseSafeFailureMarker,
  safeFailureMarker,
  safeFailureSummary,
  safeRequestFailure,
  SAFE_BROWSER_ARTIFACT_OPTIONS,
} from '../../e2e/artifactSafety'
import SafeReporter from '../../e2e/safeReporter'
import { safeDiagnosticSummary } from '../../e2e/safeDiagnostics.mjs'

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

  it('reports only allowlisted stage, category, and attempt values', () => {
    const diagnostic = safeFailureSummary(
      'test-assertion',
      'expectation-failed',
      1,
      'signup-smoke',
    )

    expect(diagnostic).toBe(
      'E2E failure (case: signup smoke; stage: test assertion; category: expectation failed; attempt 2).',
    )

    expect(safeFailureSummary(
      'https://example.test/join/secret-token',
      'password=secret',
      0,
    )).toBe(
      'E2E failure (case: runner; stage: runner startup; category: unknown; attempt 1).',
    )
  })

  it('parses only structured safe reporter markers and diagnostic records', () => {
    expect(parseSafeFailureMarker(
      'KYISPLIT_E2E_FAILURE|schema|schema-incompatible|1|schema',
    )).toBe(
      'E2E failure (case: schema; stage: schema; category: schema incompatible; attempt 1).',
    )
    expect(parseSafeFailureMarker(
      'KYISPLIT_E2E_FAILURE|schema|schema-incompatible|1|schema postgres://secret',
    )).toBeUndefined()

    const summary = safeDiagnosticSummary({
      stage: 'schema',
      category: 'schema-incompatible',
      connectionString: 'postgres://person:password@host/db',
    })
    expect(summary).toBe(
      'E2E failure (case: schema; stage: schema; category: schema incompatible; attempt 1).',
    )
    expect(summary).not.toContain('password')
  })

  it('keeps raw global errors out of reporter output', () => {
    const output: string[] = []
    const reporter = new SafeReporter(line => output.push(line))
    const secretError = new Error(
      'postgres://person:password@host/db token=secret-cookie-value',
    )

    reporter.onError(secretError as never)

    expect(output).toEqual([
      safeFailureMarker('runner-startup', 'unknown', 0, 'runner'),
    ])
    expect(output.join(' ')).not.toContain('password')
    expect(output.join(' ')).not.toContain('secret-cookie-value')
  })

  it('categorizes a setup failure without including its error message', () => {
    const output: string[] = []
    const reporter = new SafeReporter(line => output.push(line))
    const testCase = {
      parent: { project: () => ({ name: 'setup' }) },
      titlePath: () => ['setup', 'isolated database and services are ready'],
    }
    const testResult = {
      status: 'failed',
      retry: 0,
      steps: [],
      error: new Error('Cookie: sensitive-session-value'),
    }

    reporter.onTestEnd(testCase as never, testResult as never)

    expect(output).toEqual([
      safeFailureMarker('prerequisite', 'setup-check-failed', 0, 'startup-check'),
    ])
    expect(output.join(' ')).not.toContain('sensitive-session-value')
  })

  it('identifies the browser launch stage from the dedicated setup probe', () => {
    const output: string[] = []
    const reporter = new SafeReporter(line => output.push(line))
    const testCase = {
      parent: { project: () => ({ name: 'setup' }) },
      titlePath: () => ['setup', 'browser engine can launch'],
    }
    const testResult = {
      status: 'failed',
      retry: 0,
      steps: [],
      error: new Error('raw browser launch details'),
    }

    reporter.onTestEnd(testCase as never, testResult as never)

    expect(output).toEqual([
      safeFailureMarker('browser-launch', 'browser-unavailable', 0, 'browser-launch'),
    ])
    expect(output.join(' ')).not.toContain('raw browser launch details')
  })

  it('categorizes assertion errors from structured Playwright steps', () => {
    const output: string[] = []
    const reporter = new SafeReporter(line => output.push(line))
    const testCase = {
      parent: { project: () => ({ name: 'chromium' }) },
      titlePath: () => ['chromium', 'signup journey'],
      location: { file: 'C:/project/frontend/e2e/smoke.spec.ts' },
    }
    const testResult = {
      status: 'failed',
      retry: 0,
      steps: [{ category: 'expect', error: new Error('unsafe assertion text') }],
      error: new Error('unsafe assertion text'),
    }

    reporter.onTestEnd(testCase as never, testResult as never)

    expect(output).toEqual([
      safeFailureMarker('test-assertion', 'expectation-failed', 0, 'signup-smoke'),
    ])
    expect(output.join(' ')).not.toContain('unsafe assertion text')
  })

  it('reports only allowlisted critical journey checkpoints', () => {
    const output: string[] = []
    const reporter = new SafeReporter(line => output.push(line))
    const testCase = {
      parent: { project: () => ({ name: 'chromium' }) },
      titlePath: () => ['chromium', 'signup through repayment and confirmed deletion'],
      location: { file: 'C:/project/frontend/e2e/critical-journey.spec.ts' },
    }
    const testResult = {
      status: 'failed',
      retry: 0,
      annotations: [{ type: 'safe-e2e-checkpoint', description: 'journey-invite-casey' }],
      steps: [{ category: 'expect', error: new Error('unsafe assertion text') }],
      error: new Error('unsafe assertion text'),
    }

    reporter.onTestEnd(testCase as never, testResult as never)

    expect(output).toEqual([
      safeFailureMarker('test-assertion', 'expectation-failed', 0, 'journey-invite-casey'),
    ])
    expect(output.join(' ')).not.toContain('unsafe assertion text')
  })

  it('validates invite paths without exposing the token in assertions', () => {
    const token = 'c'.repeat(64)
    expect(isInvitePath(`https://example.test/join/${token}`)).toBe(true)
    expect(isInvitePath('https://example.test/join/not-a-token')).toBe(false)
    expect(isInvitePath('not a URL')).toBe(false)
  })
})
