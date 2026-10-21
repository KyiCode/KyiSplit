import type {
  FullResult,
  Reporter,
  TestError,
  TestCase,
  TestResult,
  Suite,
} from '@playwright/test/reporter'
import {
  clearSafeDiagnostic,
  recordSafeDiagnostic,
  safeFailureMarker,
} from './artifactSafety'

export default class SafeReporter implements Reporter {
  private readonly emitLine: (line: string) => void

  constructor(emitLine = (line: string) => {
    console.log(line)
  }) {
    this.emitLine = emitLine
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (['failed', 'timedOut', 'interrupted'].includes(result.status)) {
      const projectName = getProjectName(test)
      const title = test.titlePath().at(-1)
      let stage = 'test-assertion'
      let category = 'test-execution-failed'
      if (projectName === 'setup' && title === 'browser engine can launch') {
        stage = 'browser-launch'
        category = 'browser-unavailable'
      } else if (projectName === 'setup') {
        stage = 'prerequisite'
        category = 'setup-check-failed'
      } else if (projectName === 'cleanup') {
        stage = 'global-setup'
        category = 'cleanup-failed'
      } else if (hasFailedExpectation(result.steps)) {
        category = 'expectation-failed'
      }
      const caseName = safeTestCase(test, projectName, title, result.annotations)
      recordSafeDiagnostic(stage, category, caseName)
      this.emitFailure(stage, category, result.retry ?? 0, caseName)
    }
  }

  onError(error: TestError) {
    void error
    recordSafeDiagnostic('runner-startup', 'unknown', 'runner')
    this.emitFailure('runner-startup', 'unknown', 0, 'runner')
  }

  onEnd(result: FullResult) {
    // The launcher prints only safe summaries and the final run status.
    if (result.status === 'passed') clearSafeDiagnostic()
  }

  private emitFailure(
    stage: string,
    category: string,
    retry: number,
    caseName: string,
  ) {
    this.emitLine(safeFailureMarker(stage, category, retry, caseName))
  }
}

function safeTestCase(
  test: TestCase,
  projectName: string | undefined,
  title: string | undefined,
  annotations: TestResult['annotations'] = [],
) {
  if (projectName === 'setup') {
    return title === 'browser engine can launch' ? 'browser-launch' : 'startup-check'
  }
  if (projectName === 'cleanup') return 'cleanup'

  const file = test.location.file.split(/[\\/]/).at(-1)
  const checkpoint = new Set([
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
  ])
  const safeCheckpoint = [...annotations]
    .reverse()
    .find(annotation =>
      annotation.type === 'safe-e2e-checkpoint' &&
      typeof annotation.description === 'string' &&
      checkpoint.has(annotation.description),
    )
  if (typeof safeCheckpoint?.description === 'string') {
    return safeCheckpoint.description
  }
  const testCaseByTitle: Record<string, string> = {
    'same-currency detail shows payer and share amounts without FX': 'same-currency-detail',
    'cross-currency detail shows the saved FX inputs': 'cross-currency-detail',
    'Enter on Keep cancels expense deletion': 'expense-keep-keyboard',
    'repayment Enter keeps the repayment': 'repayment-enter-keep',
  }
  const titleCase = testCaseByTitle[title ?? '']
  if (titleCase) return titleCase
  const caseByFile: Record<string, string> = {
    'artifact.spec.ts': 'artifact-smoke',
    'critical-journey.spec.ts': 'critical-journey',
    'failure-paths.spec.ts': 'failure-paths',
    'activity-order.spec.ts': 'activity-order',
    'clipboard-failure.spec.ts': 'clipboard-failure',
    'mobile-layout.spec.ts': 'mobile-layout',
    'keyboard-confirmation.spec.ts': 'keyboard-confirmations',
    'smoke.spec.ts': 'signup-smoke',
  }
  return caseByFile[file ?? ''] ?? 'browser-test'
}

function getProjectName(test: TestCase) {
  let suite: Suite | undefined = test.parent
  while (suite) {
    const project = suite.project()
    if (project?.name) return project.name
    suite = suite.parent
  }
  return undefined
}

function hasFailedExpectation(steps: TestResult['steps'] | undefined): boolean {
  return steps?.some(step =>
    (step.category === 'expect' && Boolean(step.error)) ||
    hasFailedExpectation(step.steps),
  ) ?? false
}
