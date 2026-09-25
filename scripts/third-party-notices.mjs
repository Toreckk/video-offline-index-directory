import { readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { dirname, resolve, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const overrides = {
  'alloc-stdlib@0.2.4': 'alloc', 'defmt-parser@1.0.0': 'defmt', 'tauri-plugin@2.6.3': 'tauri',
  'unic-char-property@0.9.0': 'unic', 'unic-char-range@0.9.0': 'unic', 'unic-common@0.9.0': 'unic',
  'unic-ucd-ident@0.9.0': 'unic', 'unic-ucd-version@0.9.0': 'unic',
  'webview2-com@0.38.2': 'webview', 'webview2-com-macros@0.8.1': 'webview', 'webview2-com-sys@0.38.2': 'webview',
}
const reviewedLicenses = new Set(['0BSD', 'MIT', 'MIT-0', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense', 'MPL-2.0', 'CC0-1.0', 'Unicode-3.0', 'Zlib'])

export function checkLicense(expression, name) {
  const tokens = expression?.replace(/[()/]/g, ' ').split(/\s+/).filter(Boolean)
  if (!tokens?.length || tokens.some((token) => !reviewedLicenses.has(token) && token !== 'AND' && token !== 'OR')) {
    throw new Error(`Review the new license for ${name}: ${expression}`)
  }
}

export async function licenseFiles(directory) {
  const files = []
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = resolve(path, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile() && /^(licen[cs]e|copying|notice|copyright|unlicense)([._-]|$)/i.test(entry.name)) {
        files.push({ path: relative(directory, full).replaceAll('\\', '/'), text: (await readFile(full, 'utf8')).replaceAll('\r\n', '\n').trimEnd() })
      }
    }
  }
  await walk(directory)
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
}

async function javascriptPackages() {
  const workspaces = ['.', 'apps/web', 'apps/desktop', 'packages/app', 'packages/core', 'packages/platform-web', 'packages/platform-desktop']
  const workspaceByName = new Map()
  for (const path of workspaces) {
    const directory = resolve(root, path)
    const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'))
    workspaceByName.set(manifest.name, directory)
  }
  const seen = new Set()
  const packages = []
  async function visit(directory) {
    directory = await realpath(directory)
    if (seen.has(directory)) return
    seen.add(directory)
    const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'))
    if (!workspaceByName.has(manifest.name)) packages.push({name: manifest.name, version: manifest.version, license: manifest.license, directory, ecosystem: 'npm'})
    for (const name of Object.keys({...manifest.dependencies, ...manifest.peerDependencies, ...manifest.optionalDependencies}).sort()) {
      if (workspaceByName.has(name)) { await visit(workspaceByName.get(name)); continue }
      let search = directory
      let found
      while (true) {
        try { found = await realpath(resolve(search, 'node_modules', name)); break } catch (error) { if (error.code !== 'ENOENT') throw error }
        const parent = dirname(search)
        if (parent === search) break
        search = parent
      }
      if (found) await visit(found)
      else if (!manifest.optionalDependencies?.[name] && !manifest.peerDependenciesMeta?.[name]?.optional) throw new Error(`Missing installed dependency ${name} of ${manifest.name}`)
    }
  }
  for (const directory of workspaceByName.values()) await visit(directory)
  return packages
}

export async function generateNotices() {
  const result = spawnSync('cargo', ['metadata', '--locked', '--manifest-path', 'apps/desktop/src-tauri/Cargo.toml', '--filter-platform', 'x86_64-pc-windows-msvc', '--format-version', '1'], {cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024})
  if (result.error || result.status !== 0) throw result.error ?? new Error(result.stderr)
  const metadata = JSON.parse(result.stdout)
  const resolved = new Set(metadata.resolve.nodes.map((node) => node.id))
  const rust = metadata.packages.filter((pkg) => resolved.has(pkg.id) && pkg.source).map((pkg) => ({...pkg, directory: dirname(pkg.manifest_path), ecosystem: 'crate'}))
  const packages = [...await javascriptPackages(), ...rust].sort((a, b) => `${a.ecosystem}/${a.name}/${a.version}` < `${b.ecosystem}/${b.name}/${b.version}` ? -1 : 1)
  const sections = [
    'VOID — Third-party notices',
    "VOID's own source is MIT-licensed. The following dependencies retain their own terms. This conservative inventory includes production JavaScript dependencies and the resolved Windows Rust graph (including build dependencies); inclusion does not imply every package is linked into the executable.",
    'Dependency sources are unmodified. Each package has a versioned source link below. MPL-2.0 components and their source remain available under MPL-2.0; these rights are not limited by VOID\'s MIT license. Source download links provide the exact upstream package archive. WebView2 Runtime is a separately installed Microsoft component. ffprobe/FFmpeg is optional and is not distributed with VOID.',
  ]
  const documents = new Map()
  for (const pkg of packages) {
    const identity = `${pkg.name}@${pkg.version}`
    checkLicense(pkg.license, identity)
    let notices = await licenseFiles(pkg.directory)
    if (overrides[identity]) notices.push({path: 'upstream license (see scripts/license-overrides/README.md)', text: (await readFile(resolve(root, `scripts/license-overrides/${overrides[identity]}.txt`), 'utf8')).replaceAll('\r\n', '\n').trimEnd()})
    if (identity === 'selectors@0.36.1' && !notices.length) {
      const cssparser = rust.find((pkg) => pkg.name === 'cssparser' && pkg.version === '0.36.0')
      if (cssparser) notices = (await licenseFiles(cssparser.directory)).filter((file) => /Mozilla Public License/.test(file.text))
    }
    if (!notices.length) throw new Error(`No license text found for ${identity}; add a reviewed, version-specific upstream override`)
    const source = pkg.ecosystem === 'crate'
      ? `https://crates.io/api/v1/crates/${pkg.name}/${pkg.version}/download`
      : `https://registry.npmjs.org/${pkg.name}/-/${pkg.name.split('/').at(-1)}-${pkg.version}.tgz`
    const references = notices.map((notice) => {
      const id = createHash('sha256').update(notice.text).digest('hex')
      documents.set(id, notice.text)
      return `${notice.path}: document ${id}`
    })
    sections.push(`============================================================\n${pkg.ecosystem}: ${identity}\nDeclared license: ${pkg.license}\nSource: ${source}\n\n` + references.join('\n'))
  }
  sections.push('LICENSE AND ATTRIBUTION DOCUMENTS\nIdentical texts are retained once; each package above identifies its applicable documents by SHA-256. Copyright and vendor notices are included verbatim.')
  for (const [id, text] of [...documents].sort(([a], [b]) => a < b ? -1 : 1)) sections.push(`============================================================\nDocument ${id}\n\n${text}`)
  return {text: sections.join('\n\n') + '\n', count: packages.length}
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await generateNotices()
  const output = resolve(root, 'THIRD_PARTY_NOTICES.txt')
  if (process.argv.includes('--check')) {
    if ((await readFile(output, 'utf8')).replaceAll('\r\n', '\n') !== result.text) throw new Error('Third-party notices are stale. Run pnpm notices:generate and review the diff.')
  } else await writeFile(output, result.text)
  console.log(`Third-party notices verified for ${result.count} dependency versions.`)
}
