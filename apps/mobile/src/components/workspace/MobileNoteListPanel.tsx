import { MagnifyingGlass } from 'phosphor-react-native'
import { type ReactElement, type ReactNode, useMemo } from 'react'
import { FlatList, type RefreshControlProps, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { mobileCopy, mobileText } from '../../i18n/mobileText'
import { MobileLayoutProbeReadout } from '../../qa/MobileLayoutProbeReadout'
import { type MobileLayoutProbe, useMobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { desktopPanelParity, desktopToolbarActionParity } from '../../ui/desktopParity'
import { MobileIconButton } from '../../ui/MobileIconButton'
import {
  MobilePanel,
  MobileToolbar,
  MobileToolbarSpacer,
  MobileToolbarTitle,
} from '../../ui/MobilePanel'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import type { MobileNeighborhood } from '../../workspace/mobileNeighborhood'
import type { MobileNoteListFilter } from '../../workspace/mobileNoteFilters'
import type {
  MobileNote,
  MobilePropertyDisplayMode,
  MobileTypeDefinitions,
} from '../../workspace/mobileWorkspaceModel'
import { useMobilePullToSync } from '../../workspace/useMobilePullToSync'
import { Button } from '../ui/button'
import { Text } from '../ui/text'
import { MobileCreateNoteButton } from './MobileCreateNoteButton'
import { MobileNoteListBulkActionBar } from './MobileNoteListBulkActionBar'
import {
  MobileNoteListRow,
  MobileRelationshipGroupHeader,
  NoteListEmptyState,
  SearchPill,
} from './MobileNoteListItems'
import { createThemeStyles } from './MobileNoteListPanel.styles'
import {
  mobileNoteListFilterOptions,
  mobileNoteListToolbarChrome,
} from './MobileNoteListPanelChrome'
import type { MobileNoteRowActions } from './MobileSwipeableNoteRow'
import { mobileNoteListSelectionIsArchived } from './mobileNoteListBulkSelection'
import {
  type MobileNeighborhoodRow,
  mobileNeighborhoodRows,
  mobileNoteListRowActions,
} from './mobileNoteListRows'
import { mobilePaneFooterFrame } from './mobilePaneFooterLayout'
import {
  type MobileNoteListBulkActions,
  useMobileNoteListBulkSelection,
} from './useMobileNoteListSelection'

type MobileNoteListPanelProps = {
  bulkActions?: MobileNoteListBulkActions
  compact: boolean
  displayPropertyKeys?: string[]
  emptyVault?: boolean
  fullWidth?: boolean
  leading?: ReactNode
  toolbarTrailing?: ReactNode
  showCreateAction?: boolean
  layoutProbe?: boolean
  neighborhood?: MobileNeighborhood | null
  noteListFilter?: MobileNoteListFilter
  noteListFilterCounts?: Record<MobileNoteListFilter, number>
  noteListFilterVisible?: boolean
  notes: MobileNote[]
  onOpenCreateNote: () => void
  onOpenSmartCreateNote?: () => void
  onOpenSearch: () => void
  onOpenVault?: () => void
  onNoteListFilterChange?: (filter: MobileNoteListFilter) => void
  onSelectNote: (noteId: string) => void
  onToggleNoteFavorite?: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  searchQuery?: string
  selectedNoteId: string | null
  subtitle: string
  title?: string
  typeDefinitions?: MobileTypeDefinitions
}

export function MobileNoteListPanel(props: MobileNoteListPanelProps) {
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  const { bottom } = useSafeAreaInsets()
  const refreshControl = useMobilePullToSync()
  const {
    bulkActions,
    compact,
    displayPropertyKeys = [],
    emptyVault = false,
    fullWidth = false,
    leading,
    toolbarTrailing,
    showCreateAction = true,
    layoutProbe: layoutProbeEnabled = false,
    neighborhood = null,
    noteListFilter = 'open',
    noteListFilterCounts = { archived: 0, open: 0 },
    notes,
    onOpenCreateNote,
    onOpenSmartCreateNote,
    onOpenSearch,
    onOpenVault,
    onSelectNote,
    propertyDisplayModes,
    searchQuery,
    selectedNoteId,
    title = mobileCopy.inbox,
    typeDefinitions,
  } = props
  const onFilterChange = noteListFilterAction(props)
  const activeNoteId = selectedNoteId ?? notes[0]?.id ?? null
  const layoutProbe = useMobileLayoutProbe(layoutProbeEnabled)
  const bulkSelection = useMobileNoteListBulkSelection({
    bulkActions,
    neighborhood,
    notes,
    onSelectNote,
  })

  return (
    <MobilePanel
      {...layoutProbe.probe('noteList.panel')}
      style={[
        panelStyles.panel,
        compact ? panelStyles.panelCompact : null,
        fullWidth ? panelStyles.panelFullWidth : null,
        { paddingBottom: onFilterChange ? 0 : bottom },
      ]}
      testID="note-list-panel"
    >
      <MobileToolbar testID="note-list-toolbar">
        {leading}
        <View style={styles.toolbarTitleBlock}>
          <MobileToolbarTitle testID="note-list-toolbar-title" title={title} />
        </View>
        <MobileToolbarSpacer />
        {toolbarTrailing ?? (
          <MobileIconButton
            accessibilityLabel={mobileCopy.searchNotes}
            testID={mobileNoteListToolbarChrome.actionTestIds[0]}
            onPress={onOpenSearch}
          >
            <MagnifyingGlass
              color={mobileColors.textMuted}
              size={desktopToolbarActionParity.iconSize}
            />
          </MobileIconButton>
        )}
      </MobileToolbar>
      {searchQuery ? <SearchPill searchQuery={searchQuery} /> : null}
      <View style={styles.listBody}>
        <NoteListContent
          rowActions={mobileNoteListRowActions(props.bulkActions, props.onToggleNoteFavorite)}
          activeNoteId={activeNoteId}
          bulkSelection={bulkSelection}
          displayPropertyKeys={displayPropertyKeys}
          emptyVault={emptyVault}
          layoutProbe={layoutProbe.probe}
          neighborhood={neighborhood}
          notes={notes}
          onSelectNote={onSelectNote}
          onOpenVault={onOpenVault}
          propertyDisplayModes={propertyDisplayModes}
          searchQuery={searchQuery}
          refreshControl={refreshControl}
          selectedNoteId={selectedNoteId}
          typeDefinitions={typeDefinitions}
        />
        <MobileCreateNoteButton
          visible={showCreateAction && bulkSelection.selectedNotes.length === 0}
          onLongPress={onOpenSmartCreateNote}
          onPress={onOpenCreateNote}
        />
      </View>
      <BulkSelectionBar bulkActions={bulkActions} bulkSelection={bulkSelection} />
      {onFilterChange ? (
        <NoteListFilterPills
          active={noteListFilter}
          counts={noteListFilterCounts}
          onChange={onFilterChange}
        />
      ) : null}
      {layoutProbeEnabled ? (
        <MobileLayoutProbeReadout metrics={layoutProbe.metrics} testID="note-list-layout-metrics" />
      ) : null}
    </MobilePanel>
  )
}

type NoteListFilterPillsProps = {
  active: MobileNoteListFilter
  counts: Record<MobileNoteListFilter, number>
  onChange: (filter: MobileNoteListFilter) => void
}

function NoteListFilterPills({ active, counts, onChange }: NoteListFilterPillsProps) {
  const { styles } = useMobileStyles(createThemeStyles)
  const { bottom } = useSafeAreaInsets()
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.filterBar, mobilePaneFooterFrame(bottom)]}
      testID="note-list-filter-pills"
    >
      {mobileNoteListFilterOptions.map((option) => {
        const selected = active === option.value
        return (
          <Button
            accessibilityLabel={mobileText(option.labelKey)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className="shadow-none"
            key={option.value}
            size="sm"
            style={[styles.filterPill, selected ? styles.filterPillSelected : null]}
            testID={`filter-pill-${option.value}`}
            variant="ghost"
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.filterPillText, selected ? styles.filterPillTextSelected : null]}>
              {mobileText(option.labelKey)}
            </Text>
            <Text
              style={[styles.filterPillCount, selected ? styles.filterPillCountSelected : null]}
            >
              {counts[option.value].toLocaleString()}
            </Text>
          </Button>
        )
      })}
    </View>
  )
}

type NoteListContentProps = {
  rowActions?: MobileNoteRowActions
  activeNoteId: string | null
  bulkSelection: ReturnType<typeof useMobileNoteListBulkSelection>
  displayPropertyKeys: string[]
  emptyVault: boolean
  layoutProbe: MobileLayoutProbe
  neighborhood: MobileNeighborhood | null
  notes: MobileNote[]
  onOpenVault?: () => void
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  searchQuery?: string
  refreshControl?: ReactElement<RefreshControlProps>
  selectedNoteId: string | null
  typeDefinitions?: MobileTypeDefinitions
}

function NoteListContent(props: NoteListContentProps) {
  const { styles } = useMobileStyles(createThemeStyles)
  const {
    activeNoteId,
    bulkSelection,
    displayPropertyKeys,
    emptyVault,
    layoutProbe,
    neighborhood,
    notes,
    onOpenVault,
    onSelectNote,
    propertyDisplayModes,
    searchQuery,
    refreshControl,
    selectedNoteId,
    typeDefinitions,
  } = props
  if (neighborhood) {
    return (
      <NeighborhoodNoteList
        rowActions={props.rowActions}
        activeNoteId={activeNoteId}
        displayPropertyKeys={displayPropertyKeys}
        layoutProbe={layoutProbe}
        neighborhood={neighborhood}
        refreshControl={refreshControl}
        propertyDisplayModes={propertyDisplayModes}
        typeDefinitions={typeDefinitions}
        onSelectNote={onSelectNote}
      />
    )
  }

  return (
    <FlatList
      {...layoutProbe('noteList.list')}
      contentContainerStyle={styles.listContent}
      data={notes}
      extraData={bulkSelection.rowExtraData(selectedNoteId)}
      initialNumToRender={16}
      keyExtractor={(note) => note.id}
      ListEmptyComponent={
        <NoteListEmptyState
          emptyVault={emptyVault}
          searchQuery={searchQuery}
          onOpenVault={onOpenVault}
        />
      }
      refreshControl={refreshControl}
      renderItem={({ item: note }) => (
        <MobileNoteListRow
          {...{
            rowActions: bulkSelection.selectedNotes.length === 0 ? props.rowActions : undefined,
            activeNoteId,
            displayPropertyKeys,
            layoutProbe,
            multiSelected: bulkSelection.selectedNoteIds.has(note.id),
            note,
            onBeginSelection: bulkSelection.beginSelection,
            propertyDisplayModes,
            typeDefinitions,
            onSelectNote: bulkSelection.pressNote,
          }}
        />
      )}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      windowSize={5}
    />
  )
}

function BulkSelectionBar({
  bulkActions,
  bulkSelection,
}: {
  bulkActions?: MobileNoteListBulkActions
  bulkSelection: ReturnType<typeof useMobileNoteListBulkSelection>
}) {
  if (!bulkActions || bulkSelection.selectedNotes.length === 0) return null

  return (
    <MobileNoteListBulkActionBar
      archivedMode={mobileNoteListSelectionIsArchived(bulkSelection.selectedNotes)}
      count={bulkSelection.selectedNotes.length}
      onArchiveToggle={bulkSelection.archiveSelected}
      onClear={bulkSelection.clearSelection}
      onDelete={bulkSelection.deleteSelected}
      onOrganize={bulkSelection.organizeSelected}
    />
  )
}

function NeighborhoodNoteList({
  rowActions,
  activeNoteId,
  displayPropertyKeys,
  layoutProbe,
  neighborhood,
  refreshControl,
  onSelectNote,
  propertyDisplayModes,
  typeDefinitions,
}: {
  rowActions?: MobileNoteRowActions
  activeNoteId: string | null
  displayPropertyKeys: string[]
  layoutProbe: MobileLayoutProbe
  neighborhood: MobileNeighborhood
  refreshControl?: ReactElement<RefreshControlProps>
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  typeDefinitions?: MobileTypeDefinitions
}) {
  const { styles } = useMobileStyles(createThemeStyles)
  const rows = useMemo(() => mobileNeighborhoodRows(neighborhood), [neighborhood])

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={rows}
      extraData={activeNoteId}
      initialNumToRender={18}
      keyExtractor={(row) => row.id}
      refreshControl={refreshControl}
      renderItem={({ item }) =>
        neighborhoodRow({
          rowActions,
          activeNoteId,
          displayPropertyKeys,
          item,
          layoutProbe,
          propertyDisplayModes,
          typeDefinitions,
          onSelectNote,
        })
      }
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      windowSize={5}
    />
  )
}

function neighborhoodRow({
  rowActions,
  activeNoteId,
  displayPropertyKeys,
  item,
  layoutProbe,
  onSelectNote,
  propertyDisplayModes,
  typeDefinitions,
}: {
  rowActions?: MobileNoteRowActions
  activeNoteId: string | null
  displayPropertyKeys: string[]
  item: MobileNeighborhoodRow
  layoutProbe: MobileLayoutProbe
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  typeDefinitions?: MobileTypeDefinitions
}) {
  if (item.kind === 'header') return <MobileRelationshipGroupHeader group={item.group} />

  return (
    <MobileNoteListRow
      {...{
        rowActions,
        activeNoteId,
        displayPropertyKeys,
        forceSelected: item.kind === 'source',
        layoutProbe,
        note: item.note,
        propertyDisplayModes,
        typeDefinitions,
        onSelectNote,
      }}
    />
  )
}

const panelStyles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    borderRightWidth: StyleSheet.hairlineWidth,
    height: '100%',
    width: desktopPanelParity.noteListWidth,
  },
  panelCompact: {
    width: 336,
  },
  panelFullWidth: {
    width: '100%',
  },
})

function noteListFilterAction({
  noteListFilterVisible,
  onNoteListFilterChange,
}: MobileNoteListPanelProps) {
  return noteListFilterVisible ? onNoteListFilterChange : undefined
}
