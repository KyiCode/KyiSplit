import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const frontendDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const child = spawn(
  command,
  ['--prefix', '../backend', 'run', 'e2e:server'],
  {
    cwd: frontendDirectory,
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'ignore',
    windowsHide: true,
  },
)

let ready = false
let stopping = false
let requestPending = false

const readinessPoll = setInterval(() => {
  if (ready || stopping || requestPending) return
  requestPending = true
  void fetch('http://127.0.0.1:5510/api/users/verifysession', {
    signal: AbortSignal.timeout(1_000),
  })
    .then(response => {
      if (response.status === 200 || response.status === 401) ready = true
    })
    .catch(() => undefined)
    .finally(() => {
      requestPending = false
      if (ready) clearInterval(readinessPoll)
    })
}, 250)

child.once('error', () => {
  if (!stopping) recordStartupFailure()
  clearInterval(readinessPoll)
  process.exitCode = 1
})

child.once('exit', code => {
  if (!stopping) recordStartupFailure()
  clearInterval(readinessPoll)
  process.exitCode = stopping ? 0 : (code ?? 1)
})

process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))

function stop(signal) {
  if (stopping) return
  stopping = true
  clearInterval(readinessPoll)
  if (!ready) recordStartupFailure()
  child.kill(signal)
}

function recordStartupFailure() {
  const file = process.env.E2E_DIAGNOSTIC_FILE
  if (!file || fs.existsSync(file)) return
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(
      file,
      JSON.stringify({
        stage: 'packaged-server-startup',
        category: 'service-start-failed',
      }),
      'utf8',
    )
  } catch {
    // The safe runner emits a generic startup category if this file is unavailable.
  }
}
