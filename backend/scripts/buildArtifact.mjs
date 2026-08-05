import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = path.resolve(backendRoot, '..')
const frontendRoot = path.join(repositoryRoot, 'frontend')
const artifactRoot = path.join(repositoryRoot, 'release', 'kyisplit')
const releaseVersion = (process.env.RELEASE_VERSION || process.argv[2] || '').trim()

if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(releaseVersion)) {
  throw new Error(
    'Set RELEASE_VERSION or pass a version argument using letters, numbers, dots, underscores, and hyphens.',
  )
}

await requirePath(path.join(backendRoot, 'dist', 'server.js'))
await requirePath(path.join(frontendRoot, 'dist', 'index.html'))
await requirePath(path.join(frontendRoot, 'dist', 'assets'))

await fs.rm(artifactRoot, { force: true, recursive: true })
await fs.mkdir(artifactRoot, { recursive: true })
await Promise.all([
  fs.cp(path.join(backendRoot, 'dist'), path.join(artifactRoot, 'dist'), {
    recursive: true,
  }),
  fs.cp(path.join(frontendRoot, 'dist'), path.join(artifactRoot, 'public'), {
    recursive: true,
  }),
  fs.copyFile(
    path.join(backendRoot, 'package.json'),
    path.join(artifactRoot, 'package.json'),
  ),
  fs.copyFile(
    path.join(backendRoot, 'package-lock.json'),
    path.join(artifactRoot, 'package-lock.json'),
  ),
])
await fs.writeFile(
  path.join(artifactRoot, 'release.json'),
  `${JSON.stringify({ name: 'kyisplit', version: releaseVersion }, null, 2)}\n`,
  'utf8',
)

process.stdout.write(`Built KyiSplit artifact ${releaseVersion} at ${artifactRoot}\n`)

async function requirePath(target) {
  try {
    await fs.access(target)
  } catch {
    throw new Error(`Artifact input is missing: ${target}`)
  }
}
