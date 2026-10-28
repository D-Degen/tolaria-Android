import type { MobileNoteListFilter } from '../../workspace/mobileNoteFilters'

export const mobileNoteListToolbarChrome = {
  actionTestIds: ['note-list-search-action'],
} as const

export const mobileNoteListCreateChrome = {
  testID: 'note-list-create-action',
  diameter: 56,
  inset: 16,
  iconSize: 24,
} as const

export const mobileNoteListFilterOptions: ReadonlyArray<{
  labelKey: 'noteList.filter.archived' | 'noteList.filter.open'
  value: MobileNoteListFilter
}> = [
  { labelKey: 'noteList.filter.open', value: 'open' },
  { labelKey: 'noteList.filter.archived', value: 'archived' },
]

const emptyStateChrome = {
  emptyVault: {
    action: 'openVault',
    detailKey: null,
    titleKey: 'noteList.empty.noNotes',
  },
  filtered: {
    action: null,
    detailKey: 'noteList.empty.noNotes',
    titleKey: 'noteList.empty.allOrganized',
  },
  search: {
    action: null,
    detailKey: 'noteList.empty.noNotes',
    titleKey: 'noteList.empty.noMatching',
  },
} as const

export function mobileNoteListEmptyStateChrome({
  emptyVault,
  searchQuery,
}: {
  emptyVault: boolean
  searchQuery?: string
}) {
  if (searchQuery) return emptyStateChrome.search
  return emptyVault ? emptyStateChrome.emptyVault : emptyStateChrome.filtered
}
