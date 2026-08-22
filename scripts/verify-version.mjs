import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))

const manifest = await readJson('release-manifest.json')
const expected = manifest.version

if (!/^\d+\.\d+\.\d+$/.test(expected)) {
  throw new Error(`Invalid release version: ${expected}`)
}

const packagePaths = [
  'package.json',
  'apps/web/package.json',
  'apps/desktop/package.json',
  'packages/app/package.json',
  'packages/core/package.json',
  'packages/platform-web/package.json',
  'packages/platform-desktop/package.json',
]

for (const path of packagePaths) {
  const pkg = await readJson(path)
  if (pkg.version !== expected) {
    throw new Error(`${path} has version ${pkg.version}; expected ${expected}`)
  }
}

const tauriConfig = await readJson('apps/desktop/src-tauri/tauri.conf.json')
if (tauriConfig.version !== expected) {
  throw new Error(`tauri.conf.json has version ${tauriConfig.version}; expected ${expected}`)
}

const cargoToml = await readFile(resolve(root, 'apps/desktop/src-tauri/Cargo.toml'), 'utf8')
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
if (cargoVersion !== expected) {
  throw new Error(`Cargo.toml has version ${cargoVersion ?? 'missing'}; expected ${expected}`)
}

if (manifest.notes !== `docs/releases/v${expected}.md`) {
  throw new Error(`Release notes must be docs/releases/v${expected}.md`)
}

await readFile(resolve(root, manifest.notes), 'utf8')
process.stdout.write(`All release versions match v${expected}.\n`)
