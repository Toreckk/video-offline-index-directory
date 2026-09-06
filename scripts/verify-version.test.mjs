import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { verifyVersion } from './verify-version.mjs'

const repo = resolve(import.meta.dirname, '..')
const fixtureFiles = [
  'release-manifest.json', 'package.json', 'apps/web/package.json',
  'apps/desktop/package.json', 'packages/app/package.json', 'packages/core/package.json',
  'packages/platform-web/package.json', 'packages/platform-desktop/package.json',
  'apps/desktop/src-tauri/tauri.conf.json', 'apps/desktop/src-tauri/Cargo.toml',
  'apps/desktop/src-tauri/Cargo.lock', 'apps/desktop/src-tauri/windows/installer-hooks.nsh',
  'CHANGELOG.md',
]

async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), 'void-release-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const manifest = JSON.parse(await readFile(resolve(repo, 'release-manifest.json'), 'utf8'))
  for (const path of [...fixtureFiles, manifest.notes]) {
    await mkdir(dirname(resolve(root, path)), { recursive: true })
    await writeFile(resolve(root, path), await readFile(resolve(repo, path)))
  }
  return root
}

async function editJson(root, path, edit) {
  const value = JSON.parse(await readFile(resolve(root, path), 'utf8'))
  edit(value)
  await writeFile(resolve(root, path), JSON.stringify(value))
}

test('aligned repository can be validated without publication authorization', async (t) => {
  const root = await fixture(t)
  await editJson(root, 'release-manifest.json', (value) => { value.publish = false })
  assert.match(await verifyVersion(root), /^\d+\.\d+\.\d+$/)
  await assert.rejects(verifyVersion(root, { finalized: true }), /does not authorize/)
})

for (const [name, path, edit, error] of [
  ['workspace drift', 'packages/core/package.json', (v) => { v.version = '999.0.0' }, /packages\/core/],
  ['installer identity drift', 'apps/desktop/src-tauri/tauri.conf.json', (v) => { v.identifier = 'other.app' }, /identifier/],
  ['missing installer', 'release-manifest.json', (v) => { v.desktopTargets = ['nsis'] }, /exactly/],
  ['bundle drift', 'apps/desktop/src-tauri/tauri.conf.json', (v) => { v.bundle.targets = ['nsis'] }, /bundle targets/],
  ['unsupported channel', 'release-manifest.json', (v) => { v.channel = 'beta' }, /stable channel/],
  ['invalid version', 'release-manifest.json', (v) => { v.version = '01.2.3' }, /Invalid release version/],
  ['MSI identity drift', 'apps/desktop/src-tauri/tauri.conf.json', (v) => { v.bundle.windows.wix.upgradeCode = 'other' }, /upgrade code/],
]) {
  test(`rejects ${name}`, async (t) => {
    const root = await fixture(t)
    await editJson(root, path, edit)
    await assert.rejects(verifyVersion(root), error)
  })
}

test('detects stale Cargo lock entry', async (t) => {
  const root = await fixture(t)
  const path = resolve(root, 'apps/desktop/src-tauri/Cargo.lock')
  const content = await readFile(path, 'utf8')
  await writeFile(path, content.replace(/(name = "void-desktop"\r?\nversion = ")[^"]+/, '$1999.0.0'))
  await assert.rejects(verifyVersion(root), /Cargo.lock/)
})

test('publication needs final notes and a dated changelog', async (t) => {
  const root = await fixture(t)
  await editJson(root, 'release-manifest.json', (value) => { value.publish = true })
  const manifest = JSON.parse(await readFile(resolve(root, 'release-manifest.json'), 'utf8'))
  await writeFile(resolve(root, 'CHANGELOG.md'), `## [Unreleased]\n\n## [${manifest.version}] - 2026-09-05\n`)
  assert.equal(await verifyVersion(root, { finalized: true }), manifest.version)
  await writeFile(resolve(root, 'CHANGELOG.md'), '## [Unreleased]\n')
  await assert.rejects(verifyVersion(root, { finalized: true }), /dated changelog/)
  await writeFile(resolve(root, manifest.notes), '# Wrong version\n')
  await assert.rejects(verifyVersion(root), /matching VOID version/)
})
