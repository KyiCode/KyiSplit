import fs from 'node:fs'
import path from 'node:path'

const stages = new Set([
  'configuration',
  'prerequisite',
  'schema',
  'packaged-server-startup',
  'browser-launch',
  'test-assertion',
  'global-setup',
  'runner-startup',
])

const categories = new Set([
  'missing-required-setting',
  'invalid-settings',
  'missing-postgres-binary',
  'template-unavailable',
  'postgres-start-failed',
  'postgres-connect-failed',
  'schema-incompatible',
  'service-start-failed',
  'browser-unavailable',
  'expectation-failed',
  'test-execution-failed',
  'setup-check-failed',
  'cleanup-failed',
  'unknown',
])

const cases = new Set([
  'configuration',
  'prerequisite',
  'schema',
  'packaged-server',
  'browser-launch',
  'startup-check',
  'cleanup',
  'artifact-smoke',
  'signup-smoke',
  'critical-journey',
  'journey-fixture',
  'journey-owner-group',
  'journey-owner-signup',
  'journey-owner-login',
  'journey-signup-api-success',
  'journey-signup-ui-success',
  'journey-signup-server-error',
  'journey-signup-conflict',
  'journey-signup-client-error',
  'journey-signup-unexpected-status',
  'journey-group-create',
  'journey-group-post-success',
  'journey-group-post-failure',
  'journey-group-refresh-success',
  'journey-group-refresh-failure',
  'journey-group-refresh-pending',
  'journey-invite-create',
  'journey-invite-blair',
  'journey-invite-casey',
  'journey-expense-create',
  'journey-balance-results',
  'journey-repayment-create',
  'journey-repayment-delete',
  'journey-expense-delete',
  'failure-paths',
  'activity-order',
  'clipboard-failure',
  'mobile-layout',
  'mobile-page-load',
  'mobile-no-overflow',
  'mobile-detail-amount',
  'mobile-dialog-width',
  'mobile-test-account',
  'mobile-group-create',
  'mobile-expense-create',
  'mobile-expense-server-error',
  'mobile-expense-validation-error',
  'mobile-expense-unexpected-status',
  'browser-test',
  'same-currency-detail',
  'cross-currency-detail',
  'keyboard-confirmations',
  'expense-keep-keyboard',
  'repayment-enter-keep',
  'runner',
])

const labels = {
  'packaged-server-startup': 'packaged server startup',
  'browser-launch': 'browser launch',
  'test-assertion': 'test assertion',
  'global-setup': 'global/setup',
  'runner-startup': 'runner startup',
  'missing-required-setting': 'missing required setting',
  'invalid-settings': 'invalid settings',
  'missing-postgres-binary': 'PostgreSQL binary unavailable',
  'template-unavailable': 'PostgreSQL template unavailable',
  'postgres-start-failed': 'PostgreSQL startup failed',
  'postgres-connect-failed': 'PostgreSQL connection failed',
  'schema-incompatible': 'schema incompatible',
  'service-start-failed': 'service startup failed',
  'browser-unavailable': 'browser unavailable',
  'expectation-failed': 'expectation failed',
  'test-execution-failed': 'test execution failed',
  'setup-check-failed': 'setup check failed',
  'cleanup-failed': 'cleanup failed',
  'packaged-server': 'packaged server',
  'startup-check': 'startup check',
  'artifact-smoke': 'artifact smoke',
  'signup-smoke': 'signup smoke',
  'critical-journey': 'critical journey',
  'journey-fixture': 'critical journey fixture',
  'journey-owner-group': 'critical journey owner and group setup',
  'journey-owner-signup': 'critical journey owner signup',
  'journey-owner-login': 'critical journey owner login',
  'journey-signup-api-success': 'signup API accepted the request',
  'journey-signup-ui-success': 'signup confirmation UI',
  'journey-signup-server-error': 'signup API server error',
  'journey-signup-conflict': 'signup API account conflict',
  'journey-signup-client-error': 'signup API client error',
  'journey-signup-unexpected-status': 'signup API unexpected status',
  'journey-group-create': 'critical journey group creation',
  'journey-group-post-success': 'group creation API accepted the request',
  'journey-group-post-failure': 'group creation API rejected the request',
  'journey-group-refresh-success': 'group list refresh API responded',
  'journey-group-refresh-failure': 'group list refresh API failed',
  'journey-group-refresh-pending': 'group list refresh did not complete',
  'journey-invite-create': 'critical journey invitation creation',
  'journey-invite-blair': 'critical journey first invitation continuation',
  'journey-invite-casey': 'critical journey reusable invitation',
  'journey-expense-create': 'critical journey expense creation',
  'journey-balance-results': 'critical journey balance result',
  'journey-repayment-create': 'critical journey repayment creation',
  'journey-repayment-delete': 'critical journey repayment deletion',
  'journey-expense-delete': 'critical journey expense deletion',
  'failure-paths': 'failure paths',
  'activity-order': 'activity ordering',
  'clipboard-failure': 'clipboard failure fallback',
  'mobile-layout': 'narrow mobile layout',
  'mobile-page-load': 'narrow page load',
  'mobile-no-overflow': 'narrow page horizontal overflow',
  'mobile-detail-amount': 'long amount detail rendering',
  'mobile-dialog-width': 'narrow detail dialog width',
  'mobile-test-account': 'narrow layout test account setup',
  'mobile-group-create': 'long group and member name setup',
  'mobile-expense-create': 'long amount setup',
  'mobile-expense-server-error': 'long amount API server error',
  'mobile-expense-validation-error': 'long amount API validation error',
  'mobile-expense-unexpected-status': 'long amount API unexpected status',
  'browser-test': 'browser test',
  'same-currency-detail': 'same-currency expense detail',
  'cross-currency-detail': 'cross-currency expense detail',
  'keyboard-confirmations': 'keyboard confirmations',
  'expense-keep-keyboard': 'expense Keep keyboard action',
  'repayment-enter-keep': 'repayment Enter keeps item',
  configuration: 'configuration',
  prerequisite: 'prerequisite',
  schema: 'schema',
  cleanup: 'cleanup',
  runner: 'runner',
}

const defaultCaseByStage = {
  configuration: 'configuration',
  prerequisite: 'prerequisite',
  schema: 'schema',
  'packaged-server-startup': 'packaged-server',
  'browser-launch': 'browser-launch',
  'test-assertion': 'browser-test',
  'global-setup': 'cleanup',
  'runner-startup': 'runner',
}

function normalizeFailure(stage, category, caseName = defaultCaseByStage[stage]) {
  if (!stages.has(stage) || !categories.has(category)) {
    return { stage: 'runner-startup', category: 'unknown', caseName: 'runner' }
  }
  return {
    stage,
    category,
    caseName: cases.has(caseName) ? caseName : defaultCaseByStage[stage],
  }
}

export function safeFailureMarker(stage, category, retry = 0, caseName) {
  const normalized = normalizeFailure(stage, category, caseName)
  const attempt = Number.isInteger(retry) && retry >= 0 && retry <= 9
    ? retry + 1
    : 1
  return `KYISPLIT_E2E_FAILURE|${normalized.stage}|${normalized.category}|${attempt}|${normalized.caseName}`
}

export function safeFailureSummary(stage, category, retry = 0, caseName) {
  const normalized = normalizeFailure(stage, category, caseName)
  const attempt = Number.isInteger(retry) && retry >= 0 && retry <= 9
    ? retry + 1
    : 1
  const stageLabel = labels[normalized.stage] ?? normalized.stage
  const categoryLabel = labels[normalized.category] ?? normalized.category.replaceAll('-', ' ')
  const caseLabel = labels[normalized.caseName] ?? 'browser test'
  return `E2E failure (case: ${caseLabel}; stage: ${stageLabel}; category: ${categoryLabel}; attempt ${attempt}).`
}

export function parseSafeFailureMarker(line) {
  const match = /^KYISPLIT_E2E_FAILURE\|([^|]+)\|([^|]+)\|([1-9]|10)\|([^|]+)$/.exec(line)
  if (!match) return undefined
  const retry = Number(match[3]) - 1
  const normalized = normalizeFailure(match[1], match[2], match[4])
  if (
    normalized.stage !== match[1] ||
    normalized.category !== match[2] ||
    normalized.caseName !== match[4]
  ) {
    return undefined
  }
  return safeFailureSummary(
    normalized.stage,
    normalized.category,
    retry,
    normalized.caseName,
  )
}

export function safeDiagnosticRecord(stage, category, caseName) {
  return normalizeFailure(stage, category, caseName)
}

export function recordSafeDiagnostic(stage, category, caseName) {
  const file = process.env.E2E_DIAGNOSTIC_FILE
  if (!file) return
  if (fs.existsSync(file)) return
  const record = normalizeFailure(stage, category, caseName)
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(record), 'utf8')
  } catch {
    // The runner falls back to a generic safe startup category.
  }
}

export function clearSafeDiagnostic() {
  const file = process.env.E2E_DIAGNOSTIC_FILE
  if (!file) return
  try {
    fs.rmSync(file, { force: true })
  } catch {
    // An unavailable diagnostic file cannot expose raw browser output.
  }
}

export function safeDiagnosticSummary(value) {
  if (!value || typeof value !== 'object') {
    return safeFailureSummary('runner-startup', 'unknown')
  }
  const normalized = normalizeFailure(value.stage, value.category, value.caseName)
  return safeFailureSummary(
    normalized.stage,
    normalized.category,
    0,
    normalized.caseName,
  )
}
