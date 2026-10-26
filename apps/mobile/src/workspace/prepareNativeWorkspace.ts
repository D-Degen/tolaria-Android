import { preloadNativeWorkspace } from './preloadNativeWorkspace'
import { expoWorkspaceFileSystem } from './expoWorkspaceFileSystem'
import type { NativeWorkspaceIndex } from './nativeWorkspaceAccess'
import type { NativeWorkspaceSelection } from './nativeWorkspacePicker'
import type { MobileVaultConfig } from './mobileWorkspaceModel'
import { buildCooperativeWorkspaceSnapshot } from './cooperativeWorkspaceSnapshot'
import { rememberPreparedWorkspaceSnapshot } from './preparedWorkspaceSnapshot'
import { beginWorkspacePathIndex } from './workspacePathGenerations'

type PreparationDependencies = {
  preload: (selection: NativeWorkspaceSelection | null) => Promise<NativeWorkspaceSelection | null>
  readVaultConfig: (root: string) => MobileVaultConfig | null
  readIndex?: (root: string) => NativeWorkspaceIndex | null
}

/** Prepare before publishing a vault selection, while the existing save barrier is active. */
export async function prepareNativeWorkspace(
  selection: NativeWorkspaceSelection | null,
  signal?: AbortSignal,
  dependencies: PreparationDependencies = {
    preload: preloadNativeWorkspace,
    readVaultConfig: root => expoWorkspaceFileSystem.readVaultConfig?.(root) ?? null,
    readIndex: root => {
      try {
        return {
          files: expoWorkspaceFileSystem.readVaultFiles(root),
          directories: expoWorkspaceFileSystem.readVaultDirectories(root),
        }
      } catch {
        return null
      }
    },
  },
) {
  if (!selection) return dependencies.preload(selection)
  const generation = beginWorkspacePathIndex(selection.vaultRootUri)
  try {
    let candidate = selection
    while (true) {
      candidate = await dependencies.preload(candidate) ?? candidate
      if (!candidate.index && dependencies.readIndex) {
        const index = dependencies.readIndex(candidate.vaultRootUri)
        if (index) candidate = { ...candidate, index }
      }
      if (!candidate.index) return candidate
      const { index, vaultAlias, vaultLabel, vaultRootUri } = candidate
      const options = { files: index.files, folderPaths: index.directories, vaultAlias, vaultLabel,
        vaultPath: vaultRootUri, vaultConfig: dependencies.readVaultConfig(vaultRootUri) }
      const snapshot = await buildCooperativeWorkspaceSnapshot(options, signal)
      if (generation.takeChangedPaths().length > 0) {
        candidate = { ...candidate, index: undefined }
        continue
      }
      rememberPreparedWorkspaceSnapshot(index, options, snapshot)
      return candidate
    }
  } finally {
    generation.finish()
  }
}
