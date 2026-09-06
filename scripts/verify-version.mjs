import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import process from 'node:process'

export async function verifyVersion(root, { finalized = false } = {}) {
  const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))

  const manifest = await readJson('release-manifest.json')
  const expected = manifest.version

  if (typeof expected !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(expected)) {
    throw new Error(`Invalid release version: ${expected}`)
  }

  if (manifest.channel !== 'stable' || typeof manifest.publish !== 'boolean') {
    throw new Error('The release manifest requires the stable channel and a boolean publish flag')
  }
  const expectedTargets = ['msi', 'nsis']
  if (JSON.stringify([...manifest.desktopTargets ?? []].sort()) !== JSON.stringify(expectedTargets)) {
    throw new Error('The release manifest must contain exactly the msi and nsis desktop targets')
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
  if (tauriConfig.identifier !== 'com.toreckk.void') {
    throw new Error('The desktop application identifier must remain com.toreckk.void')
  }
  if (JSON.stringify([...tauriConfig.bundle?.targets ?? []].sort()) !== JSON.stringify(expectedTargets)) {
    throw new Error('Tauri bundle targets must match the release manifest')
  }
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

  const cargoLock = await readFile(resolve(root, 'apps/desktop/src-tauri/Cargo.lock'), 'utf8')
  const desktopLockEntry = cargoLock.split('[[package]]').find((entry) => /^name = "void-desktop"$/m.test(entry))
  const lockVersion = desktopLockEntry?.match(/^version = "([^"]+)"/m)?.[1]
  if (lockVersion !== expected) {
    throw new Error(`Cargo.lock has desktop version ${lockVersion ?? 'missing'}; expected ${expected}`)
  }

  if (manifest.notes !== `docs/releases/v${expected}.md`) {
    throw new Error(`Release notes must be docs/releases/v${expected}.md`)
  }

  const notes = await readFile(resolve(root, manifest.notes), 'utf8')
  if (!notes.startsWith(`# VOID v${expected}\n`) && !notes.startsWith(`# VOID v${expected}\r\n`)) {
    throw new Error('Release notes must start with the matching VOID version heading')
  }
  if (finalized) {
    if (!manifest.publish) throw new Error('The release manifest does not authorize publication')
    const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8')
    const escapedVersion = expected.replaceAll('.', '\\.')
    if (!new RegExp(`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm').test(changelog)) {
      throw new Error('Publication requires a dated changelog section for this version')
    }
    if (!changelog.includes('## [Unreleased]')) throw new Error('Changelog must retain an Unreleased section')
  }
  return expected
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const expected = await verifyVersion(resolve(import.meta.dirname, '..'), {
    finalized: process.argv.includes('--finalized'),
  })
  process.stdout.write(`All release versions match v${expected}.\n`)
}
