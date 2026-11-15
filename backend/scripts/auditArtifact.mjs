import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const artifactRoot = path.resolve(backendRoot, '..', 'release', 'kyisplit')
const files = []

await walk(artifactRoot)

let unsafePathFound = false
let sensitiveMarkerFound = false
for (const file of files) {
  const relativePath = path.relative(artifactRoot, file).replaceAll('\\', '/')
  if (
    /(^|\/)(\.env(?:\.|$)|test-results|playwright-report)(\/|$)/i.test(relativePath) ||
    /(^|\/)[^/]*(?:\.local\.|\.db$|local-profile|browser-state)/i.test(relativePath)
  ) {
    unsafePathFound = true
  }

  if (relativePath.startsWith('node_modules/') || relativePath.startsWith('flyway/')) continue
  const content = await fs.readFile(file, 'utf8')
  if (
    /correct horse battery staple|e2e-only-signing-key/i.test(content) ||
    /postgres(?:ql)?:\/\/[^\s"'`]+/i.test(content)
  ) {
    sensitiveMarkerFound = true
  }
}

if (unsafePathFound || sensitiveMarkerFound) {
  process.stderr.write(
    `Release artifact audit failed (unsafe path: ${unsafePathFound ? 'yes' : 'no'}; sensitive marker: ${sensitiveMarkerFound ? 'yes' : 'no'}).\n`,
  )
  process.exitCode = 1
} else {
  process.stdout.write(
    'Release artifact audit passed (no local profiles, browser state, demo credentials, or database targets).\n',
  )
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) await walk(entryPath)
    else if (entry.isFile()) files.push(entryPath)
  }
}
