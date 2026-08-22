import { describe, expect, it } from 'vitest'
import { createDirectoryFileSelection } from './directoryFilePicker'

describe('createDirectoryFileSelection', () => {
  it('derives the selected root from relative file paths', () => {
    const files = [
      createFile('clip.mp4', 'Holiday/Night/clip.mp4'),
      createFile('trailer.webm', 'Holiday/trailer.webm'),
    ]

    expect(createDirectoryFileSelection(files)).toEqual({
      rootName: 'Holiday',
      files,
    })
  })

  it('rejects an empty selection because its root cannot be identified', () => {
    expect(() => createDirectoryFileSelection([])).toThrow(
      'Choose a folder containing at least one file',
    )
  })
})

function createFile(name: string, webkitRelativePath: string) {
  return { name, webkitRelativePath } as File
}
