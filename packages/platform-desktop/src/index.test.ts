import { beforeEach, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { createDesktopPlatform } from './index'
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), convertFileSrc: (path: string) => `asset:${path}` }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn() }))
beforeEach(() => vi.mocked(invoke).mockReset())

it('preserves incomplete discovery diagnostics and native transaction failures', async () => {
  const platform = createDesktopPlatform()
  const scan = { files: [], complete: false, diagnostics: [{ path: 'offline', message: 'Disconnected' }] }
  vi.mocked(invoke).mockResolvedValueOnce(scan).mockRejectedValueOnce(new Error('revision conflict'))
  expect(await platform.scanLibrary!({ rootPath: 'C:\\Videos', scanSubfolders: true })).toEqual(scan)
  await expect(platform.userData!.commit({ expectedRevision: 7, records: {} })).rejects.toThrow('revision conflict')
  expect(invoke).toHaveBeenLastCalledWith('commit_user_data', { request: { expectedRevision: 7, records: {} } })
})

it('cancels the specific in-flight probe and starts no pre-cancelled helper', async () => {
  const platform = createDesktopPlatform()
  const controller = new AbortController()
  let finish!: (value: unknown) => void
  vi.mocked(invoke).mockImplementation((command) => command === 'probe_media' ? new Promise((resolve) => { finish = resolve }) : Promise.resolve())
  const result = platform.probeMedia!('C:\\Videos\\clip.mp4', controller.signal)
  const args = vi.mocked(invoke).mock.calls[0]![1] as { jobId: string }
  controller.abort()
  expect(invoke).toHaveBeenCalledWith('cancel_media_probe', { jobId: args.jobId })
  finish({ duration: 1 })
  await expect(result).rejects.toThrow('cancelled')
  vi.mocked(invoke).mockClear()
  await expect(platform.probeMedia!('unused', controller.signal)).rejects.toThrow('cancelled')
  expect(invoke).not.toHaveBeenCalled()
})
