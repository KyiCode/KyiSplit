import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { SAFE_BROWSER_ARTIFACT_OPTIONS } from './e2e/artifactSafety'
import { safeDiagnosticRecord } from './e2e/safeDiagnostics.mjs'

const frontendOrigin = 'http://127.0.0.1:5510'
const fxOrigin = 'http://127.0.0.1:5512'
const stateFile = path.resolve('test-results/e2e-database.json')
const diagnosticFile = path.resolve('test-results/e2e-safe-diagnostic.json')

function recordDiagnostic(stage: string, category: string) {
  try {
    fs.mkdirSync(path.dirname(diagnosticFile), { recursive: true })
    fs.writeFileSync(
      diagnosticFile,
      JSON.stringify(safeDiagnosticRecord(stage, category)),
      'utf8',
    )
  } catch {
    // The launcher will emit a generic safe startup category if recording fails.
  }
}

function required(name: 'E2E_POSTGRES_BIN_DIR' | 'E2E_POSTGRES_TEMPLATE_DIR') {
  const value = process.env[name]?.trim()
  if (!value) {
    recordDiagnostic('configuration', 'missing-required-setting')
    throw new Error('E2E configuration is invalid')
  }
  return value
}

const postgresBinDirectory = required('E2E_POSTGRES_BIN_DIR')
const postgresTemplateDirectory = required('E2E_POSTGRES_TEMPLATE_DIR')
const databaseName = 'kyisplit_e2e_template'
const databaseUser = 'kyisplit_e2e'
const postgresPort = '55432'
const postgresRunRoot = path.resolve('test-results/postgres')

Object.assign(process.env, {
  E2E_DATABASE_NAME: databaseName,
  E2E_DATABASE_USER: databaseUser,
  E2E_DIAGNOSTIC_FILE: diagnosticFile,
  E2E_POSTGRES_BIN_DIR: postgresBinDirectory,
  E2E_POSTGRES_PORT: postgresPort,
  E2E_POSTGRES_RUN_ROOT: postgresRunRoot,
  E2E_POSTGRES_TEMPLATE_DIR: postgresTemplateDirectory,
  E2E_RUN_STATE_FILE: stateFile,
})

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/artifacts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['./e2e/safeReporter.ts']],
  use: {
    baseURL: frontendOrigin,
    ...SAFE_BROWSER_ARTIFACT_OPTIONS,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'cleanup',
      use: { browserName: 'chromium' },
    },
    {
      name: 'cleanup',
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /global\.(?:setup|teardown)\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      name: 'packaged-application',
      command: 'node ./e2e/startPackagedServer.mjs',
      url: `${frontendOrigin}/api/users/verifysession`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'ignore',
      env: {
        ...process.env,
        BCRYPT_SALT: '4',
        E2E_DATABASE_NAME: databaseName,
        E2E_DATABASE_USER: databaseUser,
        E2E_DIAGNOSTIC_FILE: diagnosticFile,
        E2E_FX_PORT: '5512',
        E2E_POSTGRES_BIN_DIR: postgresBinDirectory,
        E2E_POSTGRES_PORT: postgresPort,
        E2E_POSTGRES_RUN_ROOT: postgresRunRoot,
        E2E_POSTGRES_TEMPLATE_DIR: postgresTemplateDirectory,
        E2E_RUN_STATE_FILE: stateFile,
        AUTH_RATE_LIMIT_MAX_ATTEMPTS: '100',
        FRONTEND_URL: frontendOrigin,
        JWT_KEY: 'e2e-only-signing-key',
        SIGNUP_TOKEN: 'e2e-only-signup-token',
        LOG_LEVEL: 'warn',
        E2E_APP_NODE_ENV: 'test',
        NODE_ENV: 'production',
        PORT: '5510',
        RATE_PROVIDER_URL: fxOrigin,
        RELEASE_VERSION: 'e2e',
      },
    },
  ],
})
