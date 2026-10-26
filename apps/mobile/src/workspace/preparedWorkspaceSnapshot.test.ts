import { expect, it, vi } from 'vitest'
import { buildLocalVaultWorkspaceSnapshot } from './localVaultSnapshot'
import { rememberPreparedWorkspaceSnapshot, takePreparedWorkspaceSnapshot } from './preparedWorkspaceSnapshot'
import { prepareNativeWorkspace } from './prepareNativeWorkspace'
import { createFileSystemWorkspaceRepository, type WorkspaceFileSystem } from './fileSystemWorkspaceRepository'
import { trackWorkspacePathWrites } from './workspacePathGenerations'
import type { NativeWorkspaceSelection } from './nativeWorkspacePicker'

function fixture() {
  const index = { directories: ['notes'], files: [{ relativePath: 'notes/one.md', absolutePath: 'file:///fixture/notes/one.md',
    content: '---\ntype: Note\ncustom: keep\n---\n# One\n', createdAt: 1, modifiedAt: 2, size: 45 }] }
  const selection = { vaultRootUri: 'file:///fixture', vaultLabel: 'Fixture', vaultAlias: 'fixture', index }
  const options = { files: index.files, folderPaths: index.directories, vaultPath: selection.vaultRootUri,
    vaultLabel: selection.vaultLabel, vaultAlias: selection.vaultAlias, vaultConfig: { defaultNoteWidth: 'wide' as const } }
  return { index, selection, options, snapshot: buildLocalVaultWorkspaceSnapshot(options) }
}

function readRepository(f: ReturnType<typeof fixture>, fs: Pick<WorkspaceFileSystem,
  'recoverPendingWrites' | 'readVaultFiles' | 'readVaultDirectories' | 'readVaultConfig'>) {
  return createFileSystemWorkspaceRepository(fs as WorkspaceFileSystem).readSnapshot({
    source: 'native', workspaceIndex: f.index, vaultRootUri: f.selection.vaultRootUri,
    vaultLabel: f.selection.vaultLabel, vaultAlias: f.selection.vaultAlias,
  })
}

it('prepares a fresh snapshot for exactly one initial read', async () => {
  const f = fixture()
  const readVaultConfig = vi.fn(() => f.options.vaultConfig)
  const preload = vi.fn(async () => f.selection)
  const selected = await prepareNativeWorkspace(f.selection, undefined, { preload, readVaultConfig })
  const prepared = takePreparedWorkspaceSnapshot(f.index, f.options)
  expect(prepared).toEqual(f.snapshot)
  expect(takePreparedWorkspaceSnapshot(f.index, f.options)).toBeNull()
  expect(preload).toHaveBeenCalledExactlyOnceWith(f.selection)
  expect(readVaultConfig).toHaveBeenCalledExactlyOnceWith(f.selection.vaultRootUri)
  expect(selected).toBe(f.selection)
})

it('re-reads the index when a path is written during workspace preparation', async () => {
  const f = fixture()
  let firstPass = true
  const preload = vi.fn(async (selection: NativeWorkspaceSelection | null) => {
    if (firstPass) {
      firstPass = false
      queueMicrotask(() => trackWorkspacePathWrites(f.selection.vaultRootUri, ['notes/one.md']))
    } else {
      expect(selection?.index).toBeUndefined()
    }
    return f.selection
  })
  const selected = await prepareNativeWorkspace(f.selection, undefined, {
    preload, readVaultConfig: () => f.options.vaultConfig,
  })

  expect(preload).toHaveBeenCalledTimes(2)
  expect(selected).toBe(f.selection)
})

it('reuses the prepared object on the first repository read without traversing files again', () => {
  const f = fixture()
  rememberPreparedWorkspaceSnapshot(f.index, f.options, f.snapshot)
  const traverse = vi.fn(() => { throw new Error('Unexpected traversal') })
  const fs = { recoverPendingWrites: () => false, readVaultFiles: traverse, readVaultDirectories: traverse,
    readVaultConfig: () => f.options.vaultConfig }
  const result = readRepository(f, fs)
  expect(result).toBe(f.snapshot)
  expect(traverse).not.toHaveBeenCalled()
  expect(takePreparedWorkspaceSnapshot(f.index, f.options)).toBeNull()
})

it('does not reuse a handoff for another root, label, alias or vault config', () => {
  for (const change of [{ vaultPath: 'file:///another' }, { vaultLabel: 'Another' }, { vaultAlias: 'other' }, { vaultConfig: {} }]) {
    const f = fixture()
    rememberPreparedWorkspaceSnapshot(f.index, f.options, f.snapshot)
    expect(takePreparedWorkspaceSnapshot(f.index, { ...f.options, ...change })).toBeNull()
    expect(takePreparedWorkspaceSnapshot(f.index, f.options)).toBeNull()
  }
})

it('rejects a replaced file or directory array, including recovery invalidating the launch index', () => {
  for (const change of [{ files: [] }, { folderPaths: [] }]) {
    const f = fixture()
    rememberPreparedWorkspaceSnapshot(f.index, f.options, f.snapshot)
    expect(takePreparedWorkspaceSnapshot(f.index, { ...f.options, ...change })).toBeNull()
  }
})

it('keeps ordinary unprepared reads and missing native selection unchanged', async () => {
  const f = fixture()
  expect(takePreparedWorkspaceSnapshot(f.index, f.options)).toBeNull()
  expect(takePreparedWorkspaceSnapshot(undefined, f.options)).toBeNull()
  const readVaultConfig = vi.fn()
  const preload = vi.fn(async () => null)
  expect(await prepareNativeWorkspace(null, undefined, { preload, readVaultConfig })).toBeNull()
  expect(readVaultConfig).not.toHaveBeenCalled()
})

it('does not expose a prepared snapshot after an obsolete load is cancelled', async () => {
  const f = fixture()
  const controller = new AbortController()
  controller.abort()
  await expect(prepareNativeWorkspace(f.selection, controller.signal, {
    preload: async () => f.selection, readVaultConfig: () => f.options.vaultConfig,
  })).rejects.toThrow('workspaceLoadCancelled')
  expect(takePreparedWorkspaceSnapshot(f.index, f.options)).toBeNull()
})

it('never publishes pre-recovery content when the repository repairs pending writes', () => {
  const f = fixture()
  rememberPreparedWorkspaceSnapshot(f.index, f.options, f.snapshot)
  const fresh = [{ ...f.index.files[0], content: '# Recovered\n' }]
  const fs = { recoverPendingWrites: () => true, readVaultFiles: () => fresh,
    readVaultDirectories: () => f.index.directories, readVaultConfig: () => f.options.vaultConfig }
  const actual = readRepository(f, fs)
  expect(actual.notes[0].rawContent).toBe('# Recovered\n')
  expect(takePreparedWorkspaceSnapshot(f.index, f.options)).toBeNull()
})

it('populates index via readIndex when candidate has no preloaded index (Android fallback)', async () => {
  const f = fixture()
  const unindexedSelection = { ...f.selection, index: undefined }
  const readVaultConfig = vi.fn(() => f.options.vaultConfig)
  const preload = vi.fn(async () => unindexedSelection)
  const readIndex = vi.fn(() => f.index)
  const selected = await prepareNativeWorkspace(unindexedSelection, undefined, { preload, readVaultConfig, readIndex })
  expect(readIndex).toHaveBeenCalledWith(unindexedSelection.vaultRootUri)
  expect(selected?.index).toEqual(f.index)
  const prepared = takePreparedWorkspaceSnapshot(f.index, f.options)
  expect(prepared).toEqual(f.snapshot)
})
