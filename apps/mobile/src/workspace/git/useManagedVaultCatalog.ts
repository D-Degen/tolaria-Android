import { useCallback, useEffect, useState } from 'react'
import { managedGitSelection, readManagedGitCatalog } from './managedGitStorage'
import { initializeLocalVaultCatalog, managedLocalSelection } from './managedLocalStorage'
import type { ManagedLocalVault } from './managedLocalVaults'
import type { ManagedGitVault, ManagedGitVaultCatalog } from './managedGitVaults'
import type { NativeWorkspaceSelection } from '../nativeWorkspacePicker'
import { prepareNativeWorkspace } from '../prepareNativeWorkspace'
import { readNativeWorkspaceStartupPreview } from '../nativeWorkspaceStartupPreview'
import type { WorkspaceSnapshotPreview } from '../workspaceSnapshotPreview'
import { logDiagnostic } from '../../diagnostics/mobileDiagnostics'

export type ActiveVault = { selection: NativeWorkspaceSelection | null; git: ManagedGitVault | null }

type CatalogState = {
  vaults: ManagedGitVault[]; localVaults: ManagedLocalVault[]; restored: ActiveVault | null
  preview: WorkspaceSnapshotPreview | null; pending: boolean; error: 'catalog' | 'selection' | null
}
type UpdateCatalog = (update: (previous: CatalogState) => CatalogState) => void

export function useManagedVaultCatalog() {
  const [state, setState] = useState<CatalogState>({ vaults: [], localVaults: [], restored: null, preview: null, pending: true, error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => restoreCatalogState(setState), [attempt])
  const reload = useCallback(async () => {
    const catalog = await readManagedGitCatalog()
    setState(previous => ({ ...previous, ...catalogLists(catalog),
      error: previous.error === 'catalog' ? null : previous.error }))
  }, [])
  const retry = useCallback(() => {
    setState(previous => ({ ...previous, pending: true, error: null }))
    setAttempt(value => value + 1)
  }, [])
  const selectPreviewNote = useCallback((noteId: string) => {
    setState(previous => selectCachedNote(previous, noteId))
  }, [])
  return { ...state, reload, retry, selectPreviewNote }
}

function selectCachedNote(state: CatalogState, noteId: string): CatalogState {
  if (!state.pending || !state.preview) return state
  const notes = state.preview.allNotes.length ? state.preview.allNotes : state.preview.notes
  if (!notes.some(note => note.id === noteId)) return state
  return { ...state, preview: { ...state.preview, selectedNoteId: noteId } }
}

function selectedAfterPreparation(selection: NativeWorkspaceSelection | null, preview: WorkspaceSnapshotPreview | null) {
  if (!selection || !preview?.selectedNoteId) return selection
  return { ...selection, selectedNoteId: preview.selectedNoteId }
}

function restoreCatalogState(update: UpdateCatalog) {
  let active = true
  const cancellation = new AbortController()
  let stage: 'catalog' | 'selection' = 'catalog'
  void initializeLocalVaultCatalog().then(async catalog => {
    if (!active) return
    logDiagnostic('info', 'catalog', `Initializing catalog. Found ${catalog.vaults.length} git vaults, ${catalog.localVaults?.length ?? 0} local vaults`)
    update(previous => ({ ...previous, ...catalogLists(catalog) }))
    stage = 'selection'
    const restored = await restoreCatalogSelection(catalog)
    if (!active) return
    logDiagnostic('info', 'catalog', `Selected vault: ${restored.selection?.vaultLabel ?? 'none'} (${restored.selection?.vaultRootUri ?? 'none'})`)
    // Existing binaries share one Expo async queue: cache IO must precede indexing.
    const preview = await readNativeWorkspaceStartupPreview(restored.selection, cancellation.signal, undefined, true).catch(() => null)
    if (!active) return
    update(previous => ({ ...previous, preview: preview ?? previous.preview }))
    const selection = await prepareNativeWorkspace(restored.selection, cancellation.signal)
    if (active) {
      cancellation.abort()
      update(previous => ({ ...previous,
        restored: { ...restored, selection: selectedAfterPreparation(selection, previous.preview) }, preview: null }))
    }
  }).then(() => finishCatalogRestoration(active, update), (error) => {
    logDiagnostic('error', 'catalog', `Catalog restoration failed at stage ${stage}`, error)
    cancellation.abort()
    finishCatalogRestoration(active, update, stage)
  })
  return () => { active = false; cancellation.abort() }
}

function finishCatalogRestoration(active: boolean, update: UpdateCatalog, error: CatalogState['error'] = null) {
  if (active) update(previous => ({ ...previous, preview: error ? previous.preview : null, pending: false, error }))
}

function catalogLists(catalog: ManagedGitVaultCatalog) {
  return { vaults: catalog.vaults, localVaults: catalog.localVaults ?? [] }
}

async function restoreCatalogSelection(catalog: ManagedGitVaultCatalog): Promise<ActiveVault> {
  const git = catalog.vaults.find(vault => vault.id === catalog.activeId)
  if (git) return { git, selection: await managedGitSelection(git) }
  const local = catalog.localVaults?.find(vault => vault.id === catalog.activeLocalId)
  if (local) return { git: null, selection: await managedLocalSelection(local) }

  // Auto-recovery: If active ID was unset, fall back to first available vault instead of empty screen
  const fallbackGit = catalog.vaults[0]
  if (fallbackGit) {
    logDiagnostic('info', 'catalog', `Active vault ID not found, auto-recovering first Git vault: ${fallbackGit.label}`)
    return { git: fallbackGit, selection: await managedGitSelection(fallbackGit) }
  }
  const fallbackLocal = catalog.localVaults?.[0]
  if (fallbackLocal) {
    logDiagnostic('info', 'catalog', `Active vault ID not found, auto-recovering first Local vault: ${fallbackLocal.label}`)
    return { git: null, selection: await managedLocalSelection(fallbackLocal) }
  }

  return { git: null, selection: null }
}
