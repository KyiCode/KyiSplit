import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter'
import { safeFailureSummary } from './artifactSafety'

class SafeReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    if (['failed', 'timedOut', 'interrupted'].includes(result.status)) {
      process.stdout.write(`${safeFailureSummary(
        test.title,
        result.retry,
        result.error?.message || '',
      )}\n`)
    }
  }

  onEnd(result: FullResult) {
    process.stdout.write(`Browser test run ${result.status}.\n`)
  }
}

export default SafeReporter
