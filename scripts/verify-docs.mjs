import { readFile, readdir, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
async function markdownFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await markdownFiles(path))
    else if (entry.name.endsWith('.md')) files.push(path)
  }
  return files
}
const rootDocs = (await readdir(root)).filter((name) => name.endsWith('.md')).map((name) => resolve(root, name))
const files = [...rootDocs, ...await markdownFiles(resolve(root, 'docs')), ...await markdownFiles(resolve(root, '.github'))]
const errors = []
let checked = 0
for (const file of files) {
  const text = (await readFile(file, 'utf8')).replace(/```[\s\S]*?```/g, '')
  const targets = [
    ...Array.from(text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g), (match) => match[1]),
    ...Array.from(text.matchAll(/(?:src|href)="([^"]+)"/g), (match) => match[1]),
  ]
  for (const target of targets) {
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(target)) continue
    const localPath = decodeURIComponent(target.split('#')[0].split('?')[0])
    if (!localPath) continue
    checked += 1
    try { await access(resolve(dirname(file), localPath)) }
    catch { errors.push(`${file}: missing local target ${target}`) }
  }
}
if (errors.length) throw new Error(errors.join('\n'))
process.stdout.write(`Verified ${checked} local link/image paths in ${files.length} Markdown files (external URLs and anchors are not checked).\n`)
