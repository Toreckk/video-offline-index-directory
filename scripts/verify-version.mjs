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

const legacyMsiUpgradeCode = '71ad7b99-f1e4-5189-90f0-1eb90aa8c545'
const windowsBundle = tauriConfig.bundle?.windows

if (windowsBundle?.wix?.upgradeCode !== legacyMsiUpgradeCode) {
  throw new Error(
    `tauri.conf.json must retain the v0.3.1 MSI upgrade code ${legacyMsiUpgradeCode}`,
  )
}

const installerHooksPath = windowsBundle?.nsis?.installerHooks
if (installerHooksPath !== 'windows/installer-hooks.nsh') {
  throw new Error('tauri.conf.json must retain the legacy NSIS installer migration hook')
}

const installerHooks = await readFile(
  resolve(root, 'apps/desktop/src-tauri', installerHooksPath),
  'utf8',
)
const requiredInstallerHookFragments = [
  '!macro NSIS_HOOK_PREINSTALL',
  'V.O.I.D.',
  'Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'ExecWait',
  '/P _?=',
]

for (const fragment of requiredInstallerHookFragments) {
  if (!installerHooks.includes(fragment)) {
    throw new Error(`Legacy NSIS installer migration hook is missing: ${fragment}`)
  }
}

if (/ExecWait[^\r\n]*\/UPDATE/.test(installerHooks)) {
  throw new Error('Legacy NSIS migration must remove old shortcuts instead of using /UPDATE')
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
