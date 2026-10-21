export {
  clearSafeDiagnostic,
  parseSafeFailureMarker,
  recordSafeDiagnostic,
  safeFailureMarker,
  safeFailureSummary,
} from './safeDiagnostics.mjs'

export const SAFE_BROWSER_ARTIFACT_OPTIONS = {
  screenshot: 'off',
  trace: 'off',
  video: 'off',
} as const

export function safeRequestFailure(operation: string, status: number) {
  const knownOperations = new Set([
    'Signup',
    'Login',
    'Logout',
    'Group creation',
    'Invite creation',
  ])
  const safeOperation = knownOperations.has(operation) ? operation : 'API request'
  const safeStatus = Number.isInteger(status) && status >= 100 && status <= 599
    ? String(status)
    : 'unknown status'
  return `${safeOperation} failed (HTTP ${safeStatus}).`
}

export function isInvitePath(value: string) {
  try {
    const pathname = new URL(value, 'http://e2e.invalid').pathname
    return /^\/join\/[0-9a-f]{64}$/i.test(pathname)
  } catch {
    return false
  }
}
