import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import {
  parseSafeFailureMarker,
  safeDiagnosticSummary,
  safeFailureSummary,
} from './safeDiagnostics.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(scriptDirectory, '..')
const diagnosticFile = path.join(
  frontendDirectory,
  'test-results',
  'e2e-safe-diagnostic.json',
)
const artifactDirectory = path.join(
  frontendDirectory,
  'test-results',
  'artifacts',
)
const environmentFile = path.join(frontendDirectory, '.env.e2e.local')
const playwrightCli = path.join(
  frontendDirectory,
  'node_modules',
  '@playwright',
  'test',
  'cli.js',
)

const inheritedEnvironment = new Map(Object.entries(process.env))
let environmentLoaded = true
try {
  if (fs.existsSync(environmentFile)) process.loadEnvFile(environmentFile)
} catch {
  process.stderr.write(`${safeFailureSummary('configuration', 'invalid-settings')}\n`)
  process.exitCode = 1
  environmentLoaded = false
}

if (environmentLoaded) {
for (const [name, value] of inheritedEnvironment) {
  process.env[name] = value
}

fs.mkdirSync(path.dirname(diagnosticFile), { recursive: true })
fs.rmSync(diagnosticFile, { force: true })
const existingArtifactFiles = new Set(listFiles(artifactDirectory))

const safeReporterFailures = []
let child
try {
  child = spawn(
    process.execPath,
    [playwrightCli, 'test', ...process.argv.slice(2)],
    {
      cwd: frontendDirectory,
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
      windowsHide: true,
    },
  )
} catch {
  finish(1)
}

if (child) {
  const parseReporterLine = line => {
    const summary = parseSafeFailureMarker(line)
    if (summary) safeReporterFailures.push(summary)
  }
  createInterface({ input: child.stdout, crlfDelay: Infinity })
    .on('line', parseReporterLine)
  createInterface({ input: child.stderr, crlfDelay: Infinity })
    .on('line', parseReporterLine)
  child.once('error', () => finish(1))
  child.once('close', code => finish(code ?? 1))
  process.once('SIGINT', () => child.kill('SIGINT'))
  process.once('SIGTERM', () => child.kill('SIGTERM'))
}

function finish(code) {
  if (process.exitCode !== undefined) return
  process.exitCode = code
  discardNewArtifacts()

  let recordedDiagnostic
  try {
    if (fs.existsSync(diagnosticFile)) {
      recordedDiagnostic = safeDiagnosticSummary(
        JSON.parse(fs.readFileSync(diagnosticFile, 'utf8')),
      )
    }
  } catch {
    recordedDiagnostic = undefined
  }

  if (recordedDiagnostic) {
    process.stderr.write(`${recordedDiagnostic}\n`)
  } else if (safeReporterFailures.length) {
    for (const summary of new Set(safeReporterFailures)) {
      process.stderr.write(`${summary}\n`)
    }
  } else if (code === 0) {
    process.stdout.write('Browser test run passed.\n')
  } else {
    process.stderr.write(
      `${safeFailureSummary('runner-startup', 'unknown')}\n`,
    )
  }
  fs.rmSync(diagnosticFile, { force: true })
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return []
  const files = []
  const pending = [directory]
  while (pending.length) {
    const current = pending.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) pending.push(entryPath)
      else if (entry.isFile()) files.push(path.resolve(entryPath))
    }
  }
  return files
}

function discardNewArtifacts() {
  const resolvedArtifactDirectory = path.resolve(artifactDirectory)
  for (const artifact of listFiles(resolvedArtifactDirectory)) {
    if (existingArtifactFiles.has(artifact)) continue
    const relativePath = path.relative(resolvedArtifactDirectory, artifact)
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) continue
    try {
      fs.rmSync(artifact, { force: true })
    } catch {
      // The entire test-results directory remains excluded from uploads.
    }
  }
}
}
