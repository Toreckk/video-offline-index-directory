import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// Inventory the installed packages, not pnpm's potentially unavailable global index.
const root = resolve(import.meta.dirname, '..')
const packages = new Map()
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = resolve(directory, entry.name)
    if (entry.name.startsWith('@')) { await collect(path); continue }
    try {
      const manifest = JSON.parse(await readFile(resolve(path, 'package.json'), 'utf8'))
      const license = typeof manifest.license === 'string' ? manifest.license : manifest.license?.type ?? manifest.licenses?.map((value) => value.type).join(' OR ') ?? null
      packages.set(`${manifest.name}@${manifest.version}`, { name: manifest.name, version: manifest.version, license })
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}
for (const entry of await readdir(resolve(root, 'node_modules/.pnpm'), { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === 'node_modules') continue
  await collect(resolve(root, 'node_modules/.pnpm', entry.name, 'node_modules'))
}
const result = spawnSync('cargo', ['metadata', '--locked', '--manifest-path', 'apps/desktop/src-tauri/Cargo.toml', '--filter-platform', 'x86_64-pc-windows-msvc', '--format-version', '1'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
if (result.error || result.status !== 0) throw result.error ?? new Error(result.stderr)
const metadata = JSON.parse(result.stdout)
const resolved = new Set(metadata.resolve.nodes.map((node) => node.id))
const rust = metadata.packages.filter((pkg) => resolved.has(pkg.id)).map(({ name, version, license, license_file, source }) => ({ name, version, license, licenseFile: license_file, source }))
const javascript = [...packages.values()].sort((a, b) => a.name.localeCompare(b.name))
const output = resolve(root, 'artifacts/audit/dependency-inventory.json')
await mkdir(resolve(root, 'artifacts/audit'), { recursive: true })
await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), target: 'x86_64-pc-windows-msvc', javascript, rust }, null, 2) + '\n')
console.log(`Inventoried ${javascript.length} installed JavaScript packages and ${rust.length} resolved Windows Rust packages. See artifacts/audit/dependency-inventory.json; declared licenses require review, not automatic legal approval.`)
const missing = [...javascript, ...rust.filter((pkg) => pkg.source)].filter((pkg) => !pkg.license && !pkg.licenseFile)
if (missing.length) { console.error('Dependencies without declared license metadata:', missing.map((pkg) => `${pkg.name}@${pkg.version}`).join(', ')); process.exitCode = 1 }
