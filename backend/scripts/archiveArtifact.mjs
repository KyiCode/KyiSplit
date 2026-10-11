import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = path.resolve(backendRoot, '..')
const releaseRoot = path.join(repositoryRoot, 'release')
const artifactRoot = path.join(releaseRoot, 'kyisplit')
const version = process.argv[2]?.trim()

if (!version || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(version)) {
  throw new Error('Pass a nonsecret release version using letters, numbers, dots, underscores, or hyphens.')
}

const metadata = JSON.parse(await fs.readFile(
  path.join(artifactRoot, 'release.json'),
  'utf8',
))
if (metadata.name !== 'kyisplit' || metadata.version !== version) {
  throw new Error('The built artifact release version does not match the requested archive version.')
}

for (const requiredPath of [
  'dist/server.js',
  'public/index.html',
  'node_modules/express/package.json',
  'package-lock.json',
]) {
  await requirePath(path.join(artifactRoot, requiredPath))
}

const archiveName = `kyisplit-${version}.tar.gz`
const archivePath = path.join(releaseRoot, archiveName)
const checksumPath = `${archivePath}.sha256`
await fs.rm(archivePath, { force: true })
await fs.rm(checksumPath, { force: true })

const tar = process.platform === 'win32' ? 'tar.exe' : 'tar'
await run(tar, ['-czf', archivePath, '-C', releaseRoot, 'kyisplit'])
const entries = (await run(tar, ['-tzf', archivePath])).trim().split(/\r?\n/)
for (const requiredEntry of [
  'kyisplit/release.json',
  'kyisplit/dist/server.js',
  'kyisplit/public/index.html',
  'kyisplit/node_modules/express/package.json',
]) {
  if (!entries.includes(requiredEntry)) {
    throw new Error(`Release archive is missing required content: ${requiredEntry}`)
  }
}
if (entries.some(entry => (
  entry.startsWith('/') ||
  entry.split('/').includes('..') ||
  /(^|\/)(test-results|playwright-report)(\/|$)/i.test(entry)
))) {
  throw new Error('Release archive contains an unsafe path.')
}

const digest = await sha256(archivePath)
const checksum = `${digest}  ${archiveName}\n`
await fs.writeFile(checksumPath, checksum, 'utf8')
if (await fs.readFile(checksumPath, 'utf8') !== checksum) {
  throw new Error('Release archive checksum could not be verified.')
}

process.stdout.write(`Created ${archiveName} with production dependencies.\n`)
process.stdout.write(`SHA-256 ${digest}\n`)

async function requirePath(target) {
  try {
    await fs.access(target)
  } catch {
    throw new Error(`Release archive input is missing: ${path.relative(artifactRoot, target)}`)
  }
}

function run(executable, arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, arguments_, {
      cwd: repositoryRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    })
    let output = ''
    child.stdout.on('data', chunk => { output += String(chunk) })
    child.once('error', () => reject(new Error('Archive tool could not be started.')))
    child.once('exit', code => {
      if (code !== 0) reject(new Error('Archive tool failed.'))
      else resolve(output)
    })
  })
}

function sha256(target) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(target)
    stream.on('data', chunk => hash.update(chunk))
    stream.once('error', reject)
    stream.once('end', () => resolve(hash.digest('hex')))
  })
}
