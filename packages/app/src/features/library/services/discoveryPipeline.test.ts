import { describe, expect, it, vi } from 'vitest'
import type { DiscoveredVideoFile } from './fileSystem'
import {
  runDiscoveryPipeline,
  type DiscoveryPipelineDependencies,
} from './discoveryPipeline'

const source = {
  kind: 'native-directory' as const,
  libraryId: 'library id',
  rootName: 'Videos',
  rootPath: 'C:\\Videos',
}

describe('runDiscoveryPipeline', () => {
  it('batches normalized assets and reads metadata only when discovery omitted it', async () => {
    const files: DiscoveredVideoFile[] = [
      createFile('ready.mp4', [], 10, 20),
      createFile('needs metadata.webm', ['Folder']),
    ]
    const batches: string[][] = []
    const folderCounts: number[] = []
    const dependencies = createDependencies(files)

    const result = await runDiscoveryPipeline({
      source,
      scanSubfolders: true,
      signal: new AbortController().signal,
      batchSize: 1,
      onFoldersScanned: (count) => {
        folderCounts.push(count)
      },
      onBatch: (assets) => {
        batches.push(assets.map((asset) => asset.id))
      },
    }, dependencies)

    expect(result.discoveredIds).toEqual([
      'library%20id/ready.mp4',
      'library%20id/Folder/needs%20metadata.webm',
    ])
    expect(batches).toEqual([
      ['library%20id/ready.mp4'],
      ['library%20id/Folder/needs%20metadata.webm'],
    ])
    expect(folderCounts).toEqual([1, 2])
    expect(dependencies.readMetadata).toHaveBeenCalledTimes(1)
  })

  it('reports discovery and metadata failures while keeping valid files', async () => {
    const diagnosticMessages: string[] = []
    const dependencies = createDependencies([
      createFile('broken.mp4', []),
      createFile('valid.mp4', [], 5, 6),
    ], true)
    dependencies.readMetadata = vi.fn(async () => {
      throw new Error('metadata unavailable')
    })

    const result = await runDiscoveryPipeline({
      source,
      scanSubfolders: true,
      signal: new AbortController().signal,
      onDiagnostic: (diagnostic) => diagnosticMessages.push(`${diagnostic.stage}:${diagnostic.message}`),
    }, dependencies)

    expect(result.discoveredIds).toEqual(['library%20id/valid.mp4'])
    expect(diagnosticMessages).toEqual([
      'discovery:folder unavailable',
      'metadata:metadata unavailable',
    ])
  })
})

function createDependencies(
  files: DiscoveredVideoFile[],
  reportDiscoveryError = false,
): DiscoveryPipelineDependencies {
  return {
    listFiles: async function* (_source, options) {
      options.onDirectoryVisited([])
      options.onDirectoryVisited(['Folder'])
      if (reportDiscoveryError) {
        options.onError({ pathParts: ['Unavailable'], error: new Error('folder unavailable') })
      }
      yield* files
    },
    readMetadata: vi.fn(async () => ({ size: 30, lastModified: 40 })),
  }
}

function createFile(
  name: string,
  pathParts: string[],
  size?: number,
  lastModified?: number,
): DiscoveredVideoFile {
  return {
    name,
    extension: name.endsWith('.webm') ? '.webm' : '.mp4',
    pathParts,
    source: { kind: 'desktop-path', absolutePath: `C:\\Videos\\${name}` },
    ...(size === undefined ? {} : { size }),
    ...(lastModified === undefined ? {} : { lastModified }),
  }
}
