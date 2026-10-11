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

export function safeFailureSummary(
  testTitle: string,
  retry: number,
  failureDetails: string,
) {
  void failureDetails
  const safeTitle = testTitle
    .replace(/https?:\/\/[^\s]+/gi, '[url]')
    .replace(/\/join\/[0-9a-f]{16,}/gi, '/join/[token]')
    .replace(/\b[0-9a-f]{64}\b/gi, '[token]')
    .replace(/\b(?:password|passwd|pwd)\s*[:=]\s*[^\s,;]+/gi, '[redacted]')
    .replace(/\b(?:cookie|set-cookie|authorization)\s*:\s*[^\r\n]+/gi, '[redacted]')
    .replace(/[^A-Za-z0-9 -]/g, '')
    .slice(0, 120)
  return `FAILED: ${safeTitle} (attempt ${retry + 1}; browser details suppressed).`
}

export function isInvitePath(value: string) {
  try {
    const pathname = new URL(value, 'http://e2e.invalid').pathname
    return /^\/join\/[0-9a-f]{64}$/i.test(pathname)
  } catch {
    return false
  }
}
