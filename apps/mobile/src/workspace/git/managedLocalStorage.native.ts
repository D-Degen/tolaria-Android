import { Directory, Paths } from 'expo-file-system'
import { randomUUID } from 'expo-crypto'
import { restoreNativeWorkspaceDirectory, type NativeWorkspaceSelection } from '../nativeWorkspacePicker'
import { readManagedGitCatalog, updateManagedGitCatalog } from './managedGitStorage.native'
import { isManagedLocalDirectory, type ManagedLocalVault } from './managedLocalVaults'
import { logDiagnostic } from '../../diagnostics/mobileDiagnostics'

export async function initializeLocalVaultCatalog() {
  logDiagnostic('info', 'catalog', 'Initializing local vault catalog...')
  const catalog = await readManagedGitCatalog()
  if (catalog.localVaults !== undefined) {
    logDiagnostic('info', 'catalog', `Catalog already initialized. Active Git: ${catalog.activeId ?? 'none'}, Active Local: ${catalog.activeLocalId ?? 'none'}`)
    return catalog
  }
  const legacy = await restoreNativeWorkspaceDirectory()
  const localVaults = legacy
    ? [{ id: 'local-legacy', label: legacy.vaultLabel, directory: 'Tolaria Vault' }]
    : await initialStarterVaults()
  return updateManagedGitCatalog(current => current.localVaults !== undefined ? current : {
    ...current, localVaults, activeLocalId: current.activeId ? null : localVaults[0]?.id ?? null,
  })
}

async function initialStarterVaults(): Promise<ManagedLocalVault[]> {
  try {
    const { prepareBundledStarterVault } = await import('./bundledStarterVault.native')
    const starter = await prepareBundledStarterVault()
    return starter ? [starter] : []
  } catch (error) {
    logDiagnostic('warn', 'starterVault', 'Could not prepare starter vault, skipping', error)
    return []
  }
}

export async function rememberLocalVault(selection: NativeWorkspaceSelection): Promise<ManagedLocalVault> {
  const vault = await importedVaultRecord(selection)
  await updateManagedGitCatalog(catalog => ({
    ...catalog,
    localVaults: [...(catalog.localVaults ?? []).filter(entry => entry.directory !== vault.directory), vault],
    activeId: null, activeLocalId: vault.id,
  }))
  return vault
}

export async function activateManagedLocalVault(vault: ManagedLocalVault) {
  const selection = await managedLocalSelection(vault)
  await updateManagedGitCatalog(catalog => {
    if (!catalog.localVaults?.some(entry => entry.id === vault.id)) throw new Error('vaultNotFound')
    return { ...catalog, activeId: null, activeLocalId: vault.id }
  })
  return selection
}

export async function managedLocalSelection(vault: ManagedLocalVault): Promise<NativeWorkspaceSelection> {
  if (!isManagedLocalDirectory(vault.directory)) throw new Error('vaultNotFound')
  const directory = new Directory(Paths.document, vault.directory)
  if (!directory.exists) throw new Error('vaultNotFound')
  return { vaultAlias: vault.id, vaultLabel: vault.label, vaultRootUri: directory.uri }
}

async function importedVaultRecord(selection: NativeWorkspaceSelection): Promise<ManagedLocalVault> {
  const root = Paths.document.uri
  const relative = selection.vaultRootUri.startsWith(root)
    ? decodeURIComponent(selection.vaultRootUri.slice(root.length)).replace(/\/$/u, '') : ''
  const id = `local-${randomUUID()}`
  if (isManagedLocalDirectory(relative)) {
    const catalog = await readManagedGitCatalog()
    return catalog.localVaults?.find(vault => vault.directory === relative) ?? { id, label: selection.vaultLabel, directory: relative }
  }
  // Session-scoped providers are copied while picker access is still available.
  const directory = `Local Vaults/${id}`
  const destination = new Directory(Paths.document, directory)
  destination.parentDirectory.create({ intermediates: true, idempotent: true })
  new Directory(selection.vaultRootUri).copy(destination)
  return { id, label: selection.vaultLabel, directory }
}
