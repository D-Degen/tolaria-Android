import type { MobileNote, MobileSidebarItem, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import { evaluateMobileSavedView, sortMobileNotesBySort } from '../workspace/mobileSavedViews'
import { isMobileTaskNote } from '../workspace/mobileTasks'
import {
  isMobileAllNotesEntry,
  isMobileInboxNote,
  isMobileMarkdownNote,
  type MobileNoteListFilter,
} from '../workspace/mobileNoteFilters'
import {
  buildMobileNeighborhood,
  filterMobileNeighborhood,
  type MobileNeighborhood,
} from '../workspace/mobileNeighborhood'
import type { MobileSidebarItemSelection } from '../components/workspace/MobileWorkspaceSidebar'
import {
  mobileNoteListMatchesQuery,
  normalizedMobileSearchQuery,
  type MobileNoteListSearchContext,
} from '../workspace/mobileNoteSearch'
import { mobileAllNotesFileVisibilityFromVaultConfig } from '../workspace/mobileVaultConfig'
import { mobileTypeNameFromSidebarLabel } from '../workspace/mobileTypeNames'
import type {
  NoteCount,
  NoteCountText,
  NoteId,
  SearchQuery,
  SidebarLabel,
  TabletSidebarSelection,
} from './tabletWorkspaceNavigation'

type TabletSidebarItemSelection = Extract<TabletSidebarSelection, { kind: 'item' }>
export { editorBlocksForSelection, editorBulletsForSelection } from './tabletWorkspaceEditorContent'
type NavigationMetadata = Pick<MobileWorkspaceSnapshot, 'notes' | 'allNotes' | 'sidebarSections' | 'vaultConfig'
  | 'typeDefinitions' | 'views' | 'noteListPropertyOverrides'>

export function tabletNavigationScopePresentation(
  snapshot: MobileWorkspaceSnapshot,
  sidebarSelection: TabletSidebarSelection,
  notes: MobileNote[],
  searchQuery: SearchQuery,
) {
  const filterVisible = shouldShowNoteListFilter(sidebarSelection)
  return {
    activeFolderId: sidebarSelection.kind === 'folder' ? sidebarSelection.id : null,
    activeItemId: sidebarSelection.kind === 'item' ? sidebarSelection.id : null,
    noteListFilterVisible: filterVisible,
    noteListSubtitle: noteListSubtitle({
      filterVisible,
      inboxSubtitle: snapshot.noteListSubtitle,
      noteCount: notes.length,
      sidebarSelection,
      searchQuery,
    }),
    noteListTitle: sidebarSelection.label,
  }
}

type SidebarNotesResolver = (
  snapshot: NavigationMetadata,
  notes: MobileNote[],
  selection: TabletSidebarItemSelection,
) => MobileNote[]

type NoteListPropertyResolver = (snapshot: NavigationMetadata, selection: TabletSidebarItemSelection) => string[]

const sidebarSectionResolvers = new Map<string, SidebarNotesResolver>([
  ['favorites', (_snapshot, notes, selection) => notesForFavoriteSelection(notes, selection)],
  ['types', (snapshot, notes, selection) => notesForTypeSelection(snapshot, notes, selection)],
  ['views', (snapshot, _notes, selection) => notesForSavedView(snapshot, selection)],
])

const noteListPropertyResolvers = new Map<string, NoteListPropertyResolver>([
  ['primary', (snapshot, selection) => primaryNoteListPropertiesForSelection(snapshot, selection)],
  ['types', (snapshot, selection) => typeDefinitionForSelection(snapshot, selection)?.listPropertiesDisplay ?? []],
  [
    'views',
    (snapshot, selection) => savedViewForSelection(snapshot, selection)?.definition.listPropertiesDisplay ?? [],
  ],
])

export function snapshotWithFavoriteOverrides(
  snapshot: MobileWorkspaceSnapshot,
  favoriteOverrides: Record<string, boolean>,
): MobileWorkspaceSnapshot {
  if (Object.keys(favoriteOverrides).length === 0) return snapshot

  return {
    ...snapshot,
    notes: snapshot.notes.map((note) => {
      const favorite = favoriteOverrides[note.id]
      return favorite === undefined ? note : { ...note, favorite }
    }),
  }
}

export function initialSelectedNoteId(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.selectedNoteId ?? snapshot.notes[0]?.id ?? null
}

export function initialSidebarSelection(snapshot: Pick<MobileWorkspaceSnapshot, 'sidebarSections'>): TabletSidebarSelection {
  const primaryItem = snapshot.sidebarSections
    .find((section) => section.id === 'primary')
    ?.items?.find(activeSidebarItem)

  return {
    count: primaryItem?.count,
    id: primaryItem?.id ?? 'inbox',
    kind: 'item',
    label: primaryItem?.label ?? 'Inbox',
    sectionId: 'primary',
  }
}

export function activeSidebarItem(item: MobileSidebarItem) {
  return item.active === true
}

export function notesForSidebarSelection(
  snapshot: NavigationMetadata,
  selection: TabletSidebarSelection,
  options: { noteListFilter?: MobileNoteListFilter } = {},
) {
  const notes = workspaceNotes(snapshot)
  if (selection.kind === 'entity') return []
  if (selection.kind === 'folder') {
    return notes.filter(
      (note) => noteMatchesArchiveFilter(note, options.noteListFilter) && noteBelongsToFolder(note, selection),
    )
  }

  const sectionResolver = sidebarSectionResolvers.get(selection.sectionId)
  const sectionNotes =
    sectionResolver?.(snapshot, notes, selection) ?? primaryNotesForSelection(snapshot, notes, selection)
  return selection.sectionId === 'types'
    ? sectionNotes.filter((note) => noteMatchesArchiveFilter(note, options.noteListFilter))
    : sectionNotes
}

export function noteListFilterCountsForSelection(
  snapshot: NavigationMetadata,
  selection: TabletSidebarSelection,
): Record<MobileNoteListFilter, number> {
  if (!shouldShowNoteListFilter(selection)) return { archived: 0, open: 0 }

  const counts = { archived: 0, open: 0 }
  for (const note of workspaceNotes(snapshot)) {
    if (!noteMatchesCountSelection(note, selection)) continue
    if (note.archived) counts.archived += 1
    else counts.open += 1
  }
  return counts
}

export function noteMatchesCountSelection(note: MobileNote, selection: TabletSidebarSelection) {
  if (selection.kind === 'folder') return noteBelongsToFolder(note, selection)
  return selection.kind === 'item' && isMobileMarkdownNote(note) && noteMatchesType(note, selection)
}

export function shouldShowNoteListFilter(selection: TabletSidebarSelection): boolean {
  return selection.kind === 'folder' || (selection.kind === 'item' && selection.sectionId === 'types')
}

function isMobileTaskRelevantNote(note: MobileNote) {
  return !note.archived && isMobileMarkdownNote(note) && (isMobileTaskNote(note) || (note.taskItems?.length ?? 0) > 0)
}

export function primaryNotesForSelection(
  snapshot: NavigationMetadata,
  notes: MobileNote[],
  selection: TabletSidebarItemSelection,
) {
  if (selection.id === 'archive') return notes.filter((note) => note.archived && isMobileMarkdownNote(note))
  if (selection.id === 'all-notes') {
    const allNotesFileVisibility = mobileAllNotesFileVisibilityFromVaultConfig(snapshot.vaultConfig)
    return notes.filter((note) => !note.archived && isMobileAllNotesEntry(note, allNotesFileVisibility))
  }
  if (selection.id === 'inbox') return inboxNotes(notes)
  if (selection.id === 'tasks') return notes.filter(isMobileTaskRelevantNote)

  return notes
}

export function neighborhoodForSelection(
  snapshot: MobileWorkspaceSnapshot,
  selection: TabletSidebarSelection,
  searchQuery: SearchQuery,
  displayPropertyKeys: string[],
): MobileNeighborhood | null {
  if (selection.kind !== 'entity') return null

  const notes = workspaceNotes(snapshot)
  const source = notes.find((note) => note.id === selection.id)
  if (!source) return null

  return filterMobileNeighborhood(
    buildMobileNeighborhood(source, notes),
    searchQuery,
    displayPropertyKeys,
    snapshot.vaultConfig?.propertyDisplayModes,
  )
}

export function workspaceNotes(snapshot: Pick<MobileWorkspaceSnapshot, 'notes' | 'allNotes'>) {
  return snapshot.allNotes ?? snapshot.notes
}

export function notesForSavedView(snapshot: NavigationMetadata, selection: TabletSidebarItemSelection) {
  const view = savedViewForSelection(snapshot, selection)
  if (!view) return []

  return evaluateMobileSavedView(view, workspaceNotes(snapshot).filter(isMobileMarkdownNote))
}

export function notesForFavoriteSelection(notes: MobileNote[], selection: TabletSidebarItemSelection) {
  const selectedNote = favoriteNoteForSelection(notes, selection)
  return selectedNote ? [selectedNote] : []
}

export function favoriteNeighborhoodSelectionForSidebarItem(
  snapshot: MobileWorkspaceSnapshot,
  selection: MobileSidebarItemSelection,
): TabletSidebarSelection | null {
  if (selection.sectionId !== 'favorites') return null

  const note = favoriteNoteForSelection(workspaceNotes(snapshot), selection)
  if (!note) return null

  return {
    id: note.id,
    kind: 'entity',
    label: note.title,
  }
}

export function favoriteNoteForSelection(
  notes: MobileNote[],
  selection: Pick<TabletSidebarItemSelection, 'id' | 'label'>,
) {
  const selectedNoteId = favoriteNoteId(selection.id)
  return (
    notes.find(
      (note) =>
        isMobileMarkdownNote(note) &&
        !note.archived &&
        note.favorite &&
        (selectedNoteId ? note.id === selectedNoteId : note.title === selection.label),
    ) ?? null
  )
}

export function favoriteNoteId(itemId: string) {
  const prefix = 'favorite-'
  return itemId.startsWith(prefix) ? itemId.slice(prefix.length) : null
}

export function notesForTypeSelection(
  snapshot: NavigationMetadata,
  notes: MobileNote[],
  selection: TabletSidebarItemSelection,
) {
  const matchingNotes = notes.filter((note) => isMobileMarkdownNote(note) && noteMatchesType(note, selection))
  return sortMobileNotesBySort(matchingNotes, typeDefinitionForSelection(snapshot, selection)?.sort ?? null)
}

export function noteMatchesArchiveFilter(note: MobileNote, filter: MobileNoteListFilter = 'open') {
  return filter === 'archived' ? note.archived === true : !note.archived
}

export function noteListPropertiesForSelection(snapshot: NavigationMetadata, selection: TabletSidebarSelection) {
  if (selection.kind !== 'item') return []
  return noteListPropertyResolvers.get(selection.sectionId)?.(snapshot, selection) ?? []
}

export function primaryNoteListPropertiesForSelection(
  snapshot: NavigationMetadata,
  selection: TabletSidebarItemSelection,
) {
  if (selection.id === 'all-notes') return snapshot.noteListPropertyOverrides?.allNotes ?? []
  if (selection.id === 'inbox') return snapshot.noteListPropertyOverrides?.inbox ?? []
  return []
}

export function savedViewForSelection(snapshot: NavigationMetadata, selection: TabletSidebarItemSelection) {
  return snapshot.views?.find((candidate) => candidate.id === selection.viewId || candidate.id === selection.id) ?? null
}

export function typeDefinitionForSelection(snapshot: NavigationMetadata, selection: TabletSidebarItemSelection) {
  const typeName = typeNameForSelection(snapshot, selection)
  return typeName ? snapshot.typeDefinitions?.[typeName] : null
}

export function typeNameForSelection(snapshot: NavigationMetadata, selection: TabletSidebarItemSelection) {
  if (selection.typeName) return selection.typeName
  const sidebarTypeName = snapshot.sidebarSections
    .find((section) => section.id === 'types')
    ?.items?.find((item) => item.id === selection.id)?.typeName

  return mobileTypeNameFromSidebarLabel(selection.label, sidebarTypeName)
}

export function filterNotesBySearch(
  notes: MobileNote[],
  searchQuery: SearchQuery,
  context: MobileNoteListSearchContext = {},
) {
  const normalizedSearch = normalizedMobileSearchQuery(searchQuery)
  if (!normalizedSearch) return notes

  return notes.filter((note) => mobileNoteListMatchesQuery(note, normalizedSearch, context))
}

export function inboxNotes(notes: MobileNote[]) {
  return notes.filter(isMobileInboxNote)
}

export function noteBelongsToFolder(note: MobileNote, selection: Extract<TabletSidebarSelection, { kind: 'folder' }>) {
  const folderPath = noteFolderPath(note)
  if (!folderPath) return false
  const normalizedNoteFolder = normalizedFolderPath(folderPath)
  const normalizedSelection = normalizedFolderPath(selection.id)
  return normalizedNoteFolder === normalizedSelection || normalizedNoteFolder.startsWith(`${normalizedSelection}/`)
}

export function noteMatchesType(note: MobileNote, selection: TabletSidebarItemSelection) {
  const selectionTypeName = mobileTypeNameFromSidebarLabel(selection.label, selection.typeName)
  if (selectionTypeName) return normalizedLabel(note.type) === normalizedLabel(selectionTypeName)

  return (
    normalizedLabel(selection.id) === normalizedLabel(`type-${note.type}`) ||
    normalizedLabel(selection.label) === normalizedLabel(note.type)
  )
}

export function normalizedLabel(label: SidebarLabel) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function normalizedFolderPath(path: SidebarLabel) {
  return path
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/')
}

export function noteFolderPath(note: MobileNote) {
  return (note.path ?? note.id).split('/').slice(0, -1).join('/')
}

export function noteListSubtitle({
  filterVisible = false,
  inboxSubtitle,
  noteCount,
  searchQuery,
  sidebarSelection,
}: {
  filterVisible?: boolean
  inboxSubtitle: NoteCountText
  noteCount: NoteCount
  searchQuery: SearchQuery
  sidebarSelection: TabletSidebarSelection
}) {
  const visibleCount = noteCount.toLocaleString()
  if (filterVisible || normalizedMobileSearchQuery(searchQuery) || sidebarSelection.kind !== 'item') return visibleCount
  if (sidebarSelection.id === 'inbox') return inboxSubtitle

  return sidebarSelection.count ?? visibleCount
}

export function selectedMobileNote(
  snapshot: MobileWorkspaceSnapshot,
  notes: MobileNote[],
  selectedNoteId: NoteId | null,
) {
  const selectedNote =
    notes.find((note) => note.id === selectedNoteId) ??
    workspaceNotes(snapshot).find((note) => note.id === selectedNoteId) ??
    notes[0]

  if (!selectedNote) return null
  return snapshot.notes.find((note) => note.id === selectedNote.id) ?? selectedNote
}
