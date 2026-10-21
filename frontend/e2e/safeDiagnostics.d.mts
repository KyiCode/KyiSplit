export type SafeFailureStage =
  | 'configuration'
  | 'prerequisite'
  | 'schema'
  | 'packaged-server-startup'
  | 'browser-launch'
  | 'test-assertion'
  | 'global-setup'
  | 'runner-startup'

export type SafeFailureCategory =
  | 'missing-required-setting'
  | 'invalid-settings'
  | 'missing-postgres-binary'
  | 'template-unavailable'
  | 'postgres-start-failed'
  | 'postgres-connect-failed'
  | 'schema-incompatible'
  | 'service-start-failed'
  | 'browser-unavailable'
  | 'expectation-failed'
  | 'test-execution-failed'
  | 'setup-check-failed'
  | 'cleanup-failed'
  | 'unknown'

export function safeFailureMarker(
  stage: string,
  category: string,
  retry?: number,
  caseName?: string,
): string
export function safeFailureSummary(
  stage: string,
  category: string,
  retry?: number,
  caseName?: string,
): string
export function parseSafeFailureMarker(line: string): string | undefined
export function safeDiagnosticRecord(
  stage: string,
  category: string,
  caseName?: string,
): { stage: string; category: string; caseName: string }
export function recordSafeDiagnostic(
  stage: string,
  category: string,
  caseName?: string,
): void
export function clearSafeDiagnostic(): void
export function safeDiagnosticSummary(value: unknown): string
