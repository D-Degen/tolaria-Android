import { evaluateMobileSavedView } from './mobileSavedViews'
import { pluralizeType } from '../../../../src/shared/typeLabels'
import {
  DEFAULT_MOBILE_ALL_NOTES_FILE_VISIBILITY,
  isMobileAllNotesEntry,
  isMobileInboxNote,
  isMobileMarkdownNote,
} from './mobileNoteFilters'
import { mobileSidebarIconFromValue, mobileToneFromValue } from './mobileWorkspaceMetadata'
import { buildMobileFolderTree } from './mobileWorkspaceFolders'
import { buildMobileTaskEntries, mobileTaskOpenCount } from './mobileTasks'
import type {
  MobileAllNotesFileVisibility,
  MobileNote,
  MobileSavedView,
  MobileSidebarIcon,
  MobileSidebarItem,
  MobileSidebarSection,
  MobileTone,
  MobileTypeDefinition,
  MobileTypeDefinitions,
} from './mobileWorkspaceModel'

type BuildMobileSidebarSectionsInput = {
  allNotesFileVisibility?: MobileAllNotesFileVisibility
  folderPaths?: string[]
  notes: MobileNote[]
  previousSections?: MobileSidebarSection[]
  typeDefinitions?: MobileTypeDefinitions
  views?: MobileSavedView[]
}

type TypeCount = {
  count: number
  tone: MobileTone
}

type TypeSectionEntry = [type: string, value: TypeCount]

const typeIcons = new Map<string, MobileSidebarIcon>([
  ['area', 'palette'],
  ['book', 'book'],
  ['evergreen', 'leaf'],
  ['goal', 'target'],
  ['journal', 'book-bookmark'],
  ['month', 'calendar'],
  ['movie', 'ticket'],
  ['person', 'users'],
  ['procedure', 'stack'],
  ['project', 'folder'],
  ['quarter', 'calendar-blank'],
  ['resource', 'books'],
  ['responsibility', 'gear'],
  ['sheet', 'calculator'],
  ['year', 'lighthouse'],
])

export function buildMobileSidebarSections({
  allNotesFileVisibility = DEFAULT_MOBILE_ALL_NOTES_FILE_VISIBILITY,
  folderPaths,
  notes,
  previousSections = [],
  typeDefinitions = {},
  views = [],
}: BuildMobileSidebarSectionsInput): MobileSidebarSection[] {
  const activeNotes = notes.filter((note) => !note.archived)
  const activeMarkdownNotes = activeNotes.filter(isMobileMarkdownNote)
  const sections = [
    primarySection(notes, allNotesFileVisibility),
    favoritesSection(activeMarkdownNotes),
    viewsSection(views, notes.filter(isMobileMarkdownNote)),
    typesSection(activeMarkdownNotes, previousSections, typeDefinitions),
    foldersSection(notes, folderPaths),
  ]

  return sections.filter((section) => (
    section.id === 'primary'
    || section.id === 'views'
    || Boolean(section.items?.length || section.folders?.length)
  ))
}

function primarySection(
  notes: MobileNote[],
  allNotesFileVisibility: MobileAllNotesFileVisibility,
): MobileSidebarSection {
  const inboxNotes = notes.filter(isMobileInboxNote)
  const allNotes = notes.filter((note) => !note.archived && isMobileAllNotesEntry(note, allNotesFileVisibility))
  const archivedNotes = notes.filter((note) => note.archived && isMobileMarkdownNote(note))
  const taskCount = mobileTaskOpenCount(buildMobileTaskEntries(notes))

  return {
    id: 'primary',
    items: [
      { active: true, count: countText(inboxNotes.length), icon: 'inbox', id: 'inbox', label: 'Inbox' },
      { count: countText(taskCount), icon: 'check-square', id: 'tasks', label: 'Aufgaben' },
      { count: countText(allNotes.length), icon: 'file', id: 'all-notes', label: 'All Notes' },
      { count: countText(archivedNotes.length), icon: 'archive', id: 'archive', label: 'Archive' },
    ],
  }
}

function favoritesSection(notes: MobileNote[]): MobileSidebarSection {
  return {
    id: 'favorites',
    items: sortedFavorites(notes).slice(0, 8).map(favoriteItem),
    label: 'Favorites',
  }
}

function sortedFavorites(notes: MobileNote[]): MobileNote[] {
  return notes
    .filter((note) => note.favorite)
    .sort(compareFavoriteIndex)
}

function compareFavoriteIndex(left: MobileNote, right: MobileNote): number {
  const leftIndex = left.favoriteIndex ?? Infinity
  const rightIndex = right.favoriteIndex ?? Infinity
  return leftIndex === rightIndex ? 0 : leftIndex - rightIndex
}

function favoriteItem(note: MobileNote): MobileSidebarItem {
  return {
    icon: 'star',
    id: `favorite-${note.id}`,
    label: note.title,
    noteId: note.id,
    tone: note.typeTone,
  }
}

function viewsSection(views: MobileSavedView[], notes: MobileNote[]): MobileSidebarSection {
  return {
    id: 'views',
    items: views.map((view) => ({
      count: countText(evaluateMobileSavedView(view, notes).length),
      icon: mobileSidebarIconFromValue(view.definition.icon, 'view'),
      id: view.id,
      label: view.definition.name,
      tone: viewTone(view),
      viewId: view.id,
    })),
    label: 'Views',
  }
}

function typesSection(
  notes: MobileNote[],
  previousSections: MobileSidebarSection[],
  typeDefinitions: MobileTypeDefinitions,
): MobileSidebarSection {
  const previousItems = previousSections.find((section) => section.id === 'types')?.items ?? []

  return {
    count: countText(notes.length),
    id: 'types',
    items: orderedTypeCounts(notes, typeDefinitions).map(([type, value]) => {
      const normalizedType = normalizedSidebarLabel(type)
      const definition = typeDefinitions[type]

      return {
        count: countText(value.count),
        icon: mobileSidebarIconFromValue(definition?.icon, typeIcons.get(normalizedType) ?? 'file'),
        id: previousTypeItemId(previousItems, type) ?? `type-${slugifySidebarId(type)}`,
        label: typeSectionLabel(type, definition),
        tone: value.tone,
        typeName: type,
      }
    }),
    label: 'Types',
  }
}

function foldersSection(notes: MobileNote[], folderPaths: string[] = []): MobileSidebarSection {
  return {
    folders: buildMobileFolderTree({ folderPaths, notes }),
    id: 'folders',
    label: 'Folders',
  }
}

function orderedTypeCounts(notes: MobileNote[], typeDefinitions: MobileTypeDefinitions) {
  const counts = countNoteTypes(notes)
  for (const [type, definition] of Object.entries(typeDefinitions)) {
    if (!isVisibleTypeDefinition(definition)) continue
    counts.set(type, counts.get(type) ?? { count: 0, tone: definition.tone ?? 'gray' })
  }

  return [...counts.entries()]
    .filter(([type]) => isVisibleTypeDefinition(typeDefinitions[type]))
    .sort((left, right) => compareTypeSectionEntries(left, right, typeDefinitions))
}

function countNoteTypes(notes: MobileNote[]) {
  const counts = new Map<string, TypeCount>()
  for (const note of notes) {
    const current = counts.get(note.type) ?? { count: 0, tone: note.typeTone }
    counts.set(note.type, { ...current, count: current.count + 1 })
  }
  return counts
}

function previousTypeItemId(items: MobileSidebarItem[], type: string): string | null {
  const label = normalizedSidebarLabel(pluralizeType(type))
  const existing = items.find((item) => item.typeName === type || normalizedSidebarLabel(item.label) === label)
  return existing?.id ?? null
}

function compareTypeSectionEntries(
  left: TypeSectionEntry,
  right: TypeSectionEntry,
  typeDefinitions: MobileTypeDefinitions,
) {
  const leftDefinition = typeDefinitions[left[0]]
  const rightDefinition = typeDefinitions[right[0]]
  const orderResult = compareTypeOrder(leftDefinition, rightDefinition)
  if (orderResult !== 0) return orderResult

  return typeSectionLabel(left[0], leftDefinition).localeCompare(typeSectionLabel(right[0], rightDefinition))
}

function compareTypeOrder(left?: MobileTypeDefinition, right?: MobileTypeDefinition) {
  const leftOrder = left?.order ?? Infinity
  const rightOrder = right?.order ?? Infinity
  if (leftOrder === rightOrder) return 0
  return leftOrder < rightOrder ? -1 : 1
}

function typeSectionLabel(type: string, definition?: MobileTypeDefinition) {
  return definition?.label ?? pluralizeType(type)
}

function isVisibleTypeDefinition(definition?: MobileTypeDefinition) {
  return definition?.visible !== false
}

function viewTone(view: MobileSavedView): MobileTone {
  return mobileToneFromValue(view.definition.color, 'gray')
}

function normalizedSidebarLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function slugifySidebarId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'note'
}

function countText(count: number): string {
  return count.toLocaleString()
}
