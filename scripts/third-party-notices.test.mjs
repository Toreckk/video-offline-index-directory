import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkLicense, licenseFiles } from './third-party-notices.mjs'

test('unreviewed licenses fail instead of silently entering a release', () => {
  for (const license of ['MIT OR Apache-2.0', '(MIT OR Apache-2.0) AND Unicode-3.0', 'MPL-2.0', 'MIT/Apache-2.0']) {
    assert.doesNotThrow(() => checkLicense(license, 'fixture'))
  }
  for (const license of [null, '', 'LicenseRef-Unknown', 'MIT OR Unreviewed']) {
    assert.throws(() => checkLicense(license, 'fixture'), /Review the new license/)
  }
})

test('preserves nested copyright and notice files, with portable line endings', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'void-notices-'))
  t.after(() => rm(root, {recursive: true, force: true}))
  await mkdir(join(root, 'vendor'))
  await mkdir(join(root, 'node_modules'))
  await writeFile(join(root, 'LICENSE-MIT'), 'Copyright Example\r\nPermission granted.\r\n')
  await writeFile(join(root, 'vendor/NOTICE.txt'), 'Vendor attribution\n')
  await writeFile(join(root, 'vendor/COPYING'), 'Vendor terms\n')
  await writeFile(join(root, 'node_modules/LICENSE'), 'Unrelated dependency')
  await writeFile(join(root, 'source.rs'), 'Not a notice')
  const files = await licenseFiles(root)
  assert.deepEqual(files.map((file) => file.path), ['LICENSE-MIT', 'vendor/COPYING', 'vendor/NOTICE.txt'])
  assert.equal(files[0].text, 'Copyright Example\nPermission granted.')
})
