import { useState, type ReactNode } from 'react'
import { useMobileStyles, useMobileColors } from '../../ui/theme/useMobileTheme'
import {
  Archive,
  ArrowsInLineHorizontal,
  ArrowsOutLineHorizontal,
  CalendarBlank,
  CaretDown,
  CaretRight,
  CircleIcon,
  Clock,
  Code,
  Copy,
  Folder,
  LinkSimple,
  ListBullets,
  MagnifyingGlass,
  MapTrifold,
  PencilSimple,
  Plus,
  Shapes,
  Star,
  Tag,
  Trash,
  WarningCircle,
} from 'phosphor-react-native'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { mobileCopy, mobileText } from '../../i18n/mobileText'
import { type MobileLayoutProbe, probeProps, useMobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { MobilePanel, MobileToolbar, MobileToolbarSpacer, MobileToolbarTitle } from '../../ui/MobilePanel'
import { MobileIconButton } from '../../ui/MobileIconButton'
import { MobilePropertyRow } from '../../ui/MobilePropertyRow'
import { mobileFrontmatterState, needsMobileFrontmatterNotice } from '../../workspace/mobileFrontmatterState'
import { type MobileInspectorPropertySlot, type MobileInspectorRelationshipSlot, mobileInspectorPropertySlots, mobileInspectorRelationshipSlots } from '../../workspace/mobileInspectorSchema'
import { resolveMobileMissingTypeName } from '../../workspace/mobileMissingType'
import type { MobileNeighborhoodGroup } from '../../workspace/mobileNeighborhood'
import type { MobileNote, MobilePropertyDisplayMode, MobilePropertyValue, MobileTypeDefinitions } from '../../workspace/mobileWorkspaceModel'
import { Text } from '../ui/text'
import { MobileFrontmatterStateNotice } from './MobileFrontmatterStateNotice'
import { createPropertyPanelStyles } from './MobilePropertiesPanel.styles'
import { mobileInspectorPlaceholderActionLabel } from './MobilePropertiesPanelModel'
import { chipTone, statusTone } from './mobileWorkspaceTone'
import { PropertySection, PropertyActionRow } from './MobilePropertyRows'
import { testIdSegment, relationshipHeading } from './mobilePropertyRowModel'
import { EditableChipValue, EditableTagsValue, EditablePropertyRow, WorkspaceBadge } from './MobilePropertyValues'
import { RelationshipValues, ReferenceGroups } from './MobileRelationshipRows'

type MobilePropertiesPanelProps = {
  compact: boolean
  fullWidth?: boolean
  showToolbar?: boolean
  layoutProbe?: boolean
  note: MobileNote | null
  onAddProperty: (key?: string) => void
  onAddRelationship: (key?: string) => void
  onDeleteProperty: (noteId: string, key: string) => void
  onEditProperty: (noteId: string, key: string, value: MobilePropertyValue) => void
  onEnterNeighborhood?: (noteId: string) => void
  onFixInvalidFrontmatter?: () => void
  onInitializeProperties: (noteId: string) => void
  onCreateMissingType: (typeName: string) => void
  onOpenChangeNoteType: () => void
  onRemoveRelationship: (noteId: string, key: string, ref: string) => void
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  referenceGroups?: MobileNeighborhoodGroup[]
  typeDefinitions?: MobileTypeDefinitions
  onToggleFavorite?: () => void
  onOpenFindInNote?: () => void
  onOpenTableOfContents?: () => void
  onToggleNoteWidth?: () => void
  onSetArchived?: (archived: boolean) => void
  onToggleRawEditor?: () => void
  onCopyFilePath?: () => void
  onOpenMoveNoteToFolder?: () => void
  onOpenRenameNoteFile?: () => void
  onRenameNoteFileToTitle?: () => void
  onCopyDeepLink?: () => void
  onExportNoteAsPdf?: () => void
  onDeleteNote?: () => void
}

export function MobilePropertiesPanel(props: MobilePropertiesPanelProps) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { panelStyles } = themeStyles
  const { bottom } = useSafeAreaInsets()
  const {
    compact,
    fullWidth = false,
    layoutProbe = false,
  } = props
  const propertyLayoutProbe = useMobileLayoutProbe(layoutProbe)

  return (
    <MobilePanel
      {...probeProps(propertyLayoutProbe.probe, 'properties.panel')}
      style={[
        panelStyles.panel,
        compact ? panelStyles.panelCompact : null,
        fullWidth ? panelStyles.panelFullWidth : null,
      ]}
      testID="properties-panel"
    >
      <PropertiesPanelToolbar {...props} />
      <ScrollView
        {...probeProps(propertyLayoutProbe.probe, 'properties.scroll')}
        contentContainerStyle={[panelStyles.content, props.note ? null : panelStyles.emptyContent, { paddingBottom: panelStyles.content.padding + bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <PropertiesPanelContent layoutProbe={propertyLayoutProbe.probe} props={props} />
      </ScrollView>
    </MobilePanel>
  )
}

function PropertiesPanelToolbar(props: MobilePropertiesPanelProps) {
  const mobileColors = useMobileColors()
  if (props.showToolbar === false) return null
  return <MobileToolbar testID="properties-toolbar">
    <MobileToolbarTitle testID="properties-toolbar-title" title={mobileCopy.properties} variant="inspector" />
    <MobileToolbarSpacer />
    {props.note ? <MobileIconButton
      accessibilityLabel={mobileText('inspector.properties.addProperty')}
      testID="properties-toolbar-add"
      onPress={() => props.onAddProperty()}
    ><Plus size={16} color={mobileColors.textMuted} /></MobileIconButton> : null}
  </MobileToolbar>
}

function PropertiesPanelContent({
  layoutProbe,
  props,
}: {
  layoutProbe: MobileLayoutProbe
  props: MobilePropertiesPanelProps
}) {
  if (!props.note) return <PropertiesEmptyState />

  return (
    <NoteProperties
      layoutProbe={layoutProbe}
      {...notePropertiesProps(props)}
    />
  )
}

function notePropertiesProps(props: MobilePropertiesPanelProps): Omit<NotePropertiesProps, 'layoutProbe'> {
  if (!props.note) throw new Error('A selected note is required to build property rows')

  return {
    note: props.note,
    onAddProperty: props.onAddProperty,
    onAddRelationship: props.onAddRelationship,
    onEditProperty: props.onEditProperty,
    onEnterNeighborhood: props.onEnterNeighborhood,
    onFixInvalidFrontmatter: props.onFixInvalidFrontmatter,
    onInitializeProperties: props.onInitializeProperties,
    onCreateMissingType: props.onCreateMissingType,
    onOpenChangeNoteType: props.onOpenChangeNoteType,
    onRemoveRelationship: props.onRemoveRelationship,
    onSelectNote: props.onSelectNote,
    propertyDisplayModes: props.propertyDisplayModes,
    referenceGroups: props.referenceGroups ?? [],
    typeDefinitions: props.typeDefinitions,
    onToggleFavorite: props.onToggleFavorite,
    onOpenFindInNote: props.onOpenFindInNote,
    onOpenTableOfContents: props.onOpenTableOfContents,
    onToggleNoteWidth: props.onToggleNoteWidth,
    onSetArchived: props.onSetArchived,
    onToggleRawEditor: props.onToggleRawEditor,
    onCopyFilePath: props.onCopyFilePath,
    onOpenMoveNoteToFolder: props.onOpenMoveNoteToFolder,
    onOpenRenameNoteFile: props.onOpenRenameNoteFile,
    onRenameNoteFileToTitle: props.onRenameNoteFileToTitle,
    onCopyDeepLink: props.onCopyDeepLink,
    onExportNoteAsPdf: props.onExportNoteAsPdf,
    onDeleteNote: props.onDeleteNote,
  }
}

type NotePropertiesProps = {
  layoutProbe: MobileLayoutProbe
  note: MobileNote
  onAddProperty: (key?: string) => void
  onAddRelationship: (key?: string) => void
  onEditProperty: (noteId: string, key: string, value: MobilePropertyValue) => void
  onEnterNeighborhood?: (noteId: string) => void
  onFixInvalidFrontmatter?: () => void
  onInitializeProperties: (noteId: string) => void
  onCreateMissingType: (typeName: string) => void
  onOpenChangeNoteType: () => void
  onRemoveRelationship: (noteId: string, key: string, ref: string) => void
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  referenceGroups: MobileNeighborhoodGroup[]
  typeDefinitions?: MobileTypeDefinitions
  onToggleFavorite?: () => void
  onOpenFindInNote?: () => void
  onOpenTableOfContents?: () => void
  onToggleNoteWidth?: () => void
  onSetArchived?: (archived: boolean) => void
  onToggleRawEditor?: () => void
  onCopyFilePath?: () => void
  onOpenMoveNoteToFolder?: () => void
  onOpenRenameNoteFile?: () => void
  onRenameNoteFileToTitle?: () => void
  onCopyDeepLink?: () => void
  onExportNoteAsPdf?: () => void
  onDeleteNote?: () => void
}

function NoteProperties(props: NotePropertiesProps) {
  const { propertyStyles } = useMobileStyles(createPropertyPanelStyles)
  const { layoutProbe, note, onFixInvalidFrontmatter, onInitializeProperties, onSelectNote, referenceGroups, typeDefinitions } = props
  const frontmatterState = mobileFrontmatterState(note)
  const propertySlots = mobileInspectorPropertySlots(note, typeDefinitions)
  const relationshipSlots = mobileInspectorRelationshipSlots(note, typeDefinitions)
  const missingTypeName = resolveMobileMissingTypeName(note, typeDefinitions)

  const [propertiesExpanded, setPropertiesExpanded] = useState(true)
  const [relationshipsExpanded, setRelationshipsExpanded] = useState(true)
  const [infoExpanded, setInfoExpanded] = useState(true)

  if (needsMobileFrontmatterNotice(frontmatterState)) {
    return (
      <>
        <MobileFrontmatterStateNotice
          state={frontmatterState}
          onFixInvalidFrontmatter={onFixInvalidFrontmatter}
          onInitializeProperties={() => onInitializeProperties(note.id)}
        />
        <ReferenceGroups
          groups={referenceGroups}
          layoutProbe={layoutProbe}
          typeDefinitions={typeDefinitions}
          onSelectNote={onSelectNote}
        />
      </>
    )
  }

  const propertyCount = 1 + (note.status ? 1 : 0) + (note.tags?.length ? 1 : 0) + (note.properties?.length ?? 0)
  const relationshipCount = (note.relationships?.length ?? 0) + (referenceGroups?.length ?? 0)
  const hasQuickActions = Boolean(
    props.onToggleFavorite || props.onOpenFindInNote || props.onOpenTableOfContents ||
    props.onEnterNeighborhood || props.onToggleNoteWidth || props.onSetArchived || props.onToggleRawEditor
  )

  return (
    <>
      {hasQuickActions ? <NoteQuickActionBar props={props} /> : null}

      <PropertyAccordionSection
        count={propertyCount}
        expanded={propertiesExpanded}
        testID="properties-accordion-properties"
        title={mobileCopy.properties}
        onToggle={() => setPropertiesExpanded((prev) => !prev)}
      >
        <StandardPropertyRows missingTypeName={missingTypeName} props={props} />
        <CustomPropertyRows propertySlots={propertySlots} props={props} />
        <PropertyActionRow
          label={mobileText('inspector.properties.addProperty')}
          layoutProbe={layoutProbe}
          layoutProbeId="properties.action.add-property"
          testID="property-action-add-property"
          onPress={() => props.onAddProperty()}
        />
      </PropertyAccordionSection>

      <PropertyAccordionSection
        count={relationshipCount}
        expanded={relationshipsExpanded}
        testID="properties-accordion-relationships"
        title={mobileText('mobile.properties.addRelationships')}
        onToggle={() => setRelationshipsExpanded((prev) => !prev)}
      >
        <View style={propertyStyles.relationshipGroup} testID="properties-relationships-group">
          <RelationshipPropertyRows relationshipSlots={relationshipSlots} props={props} />
          <PropertyActionsAndReferences props={props} />
        </View>
      </PropertyAccordionSection>

      <PropertyAccordionSection
        expanded={infoExpanded}
        testID="properties-accordion-info"
        title={mobileText('inspector.info.title')}
        onToggle={() => setInfoExpanded((prev) => !prev)}
      >
        <NoteInfoPropertyRows props={props} />
      </PropertyAccordionSection>
    </>
  )
}

function NoteQuickActionBar({ props }: { props: NotePropertiesProps }) {
  const { note, onToggleFavorite, onOpenFindInNote, onOpenTableOfContents, onEnterNeighborhood, onToggleNoteWidth, onSetArchived, onToggleRawEditor } = props
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { quickActionStyles } = themeStyles
  const mobileColors = useMobileColors()

  const isFavorite = Boolean(note.favorite)
  const isArchived = Boolean(note.archived)
  const isWide = note.noteWidth === 'wide'

  return (
    <View style={quickActionStyles.bar} testID="properties-quick-action-bar">
      {onToggleFavorite ? (
        <Pressable
          accessibilityLabel={isFavorite ? mobileText('command.note.removeFavorite') : mobileText('command.note.addFavorite')}
          accessibilityRole="button"
          style={({ pressed }) => [
            quickActionStyles.button,
            isFavorite && quickActionStyles.buttonActive,
            pressed && quickActionStyles.buttonPressed,
          ]}
          testID="properties-action-favorite"
          onPress={onToggleFavorite}
        >
          <Star
            color={isFavorite ? mobileColors.yellow : mobileColors.textMuted}
            size={18}
            weight={isFavorite ? 'fill' : 'regular'}
          />
        </Pressable>
      ) : null}

      {onOpenFindInNote ? (
        <Pressable
          accessibilityLabel={mobileText('command.note.findInNote')}
          accessibilityRole="button"
          style={({ pressed }) => [
            quickActionStyles.button,
            pressed && quickActionStyles.buttonPressed,
          ]}
          testID="properties-action-find"
          onPress={onOpenFindInNote}
        >
          <MagnifyingGlass color={mobileColors.textMuted} size={18} />
        </Pressable>
      ) : null}

      {onOpenTableOfContents ? (
        <Pressable
          accessibilityLabel={mobileText('menu.note.toggleTableOfContents')}
          accessibilityRole="button"
          style={({ pressed }) => [
            quickActionStyles.button,
            pressed && quickActionStyles.buttonPressed,
          ]}
          testID="properties-action-toc"
          onPress={onOpenTableOfContents}
        >
          <ListBullets color={mobileColors.textMuted} size={18} />
        </Pressable>
      ) : null}

      {onEnterNeighborhood ? (
        <Pressable
          accessibilityLabel={mobileText('editor.toolbar.openNeighborhood')}
          accessibilityRole="button"
          style={({ pressed }) => [
            quickActionStyles.button,
            pressed && quickActionStyles.buttonPressed,
          ]}
          testID="properties-action-neighborhood"
          onPress={() => onEnterNeighborhood(note.id)}
        >
          <MapTrifold color={mobileColors.textMuted} size={18} />
        </Pressable>
      ) : null}

      {onToggleNoteWidth ? (
        <Pressable
          accessibilityLabel={isWide ? mobileText('editor.toolbar.noteWidthNormal') : mobileText('editor.toolbar.noteWidthWide')}
          accessibilityRole="button"
          style={({ pressed }) => [
            quickActionStyles.button,
            isWide && quickActionStyles.buttonActive,
            pressed && quickActionStyles.buttonPressed,
          ]}
          testID="properties-action-width"
          onPress={onToggleNoteWidth}
        >
          {isWide ? (
            <ArrowsInLineHorizontal color={mobileColors.primary} size={18} />
          ) : (
            <ArrowsOutLineHorizontal color={mobileColors.textMuted} size={18} />
          )}
        </Pressable>
      ) : null}

      {onSetArchived ? (
        <Pressable
          accessibilityLabel={isArchived ? mobileText('command.note.unarchiveNote') : mobileText('command.note.archiveNote')}
          accessibilityRole="button"
          style={({ pressed }) => [
            quickActionStyles.button,
            isArchived && quickActionStyles.buttonActive,
            pressed && quickActionStyles.buttonPressed,
          ]}
          testID="properties-action-archive"
          onPress={() => onSetArchived(!isArchived)}
        >
          <Archive color={isArchived ? mobileColors.primary : mobileColors.textMuted} size={18} />
        </Pressable>
      ) : null}

      {onToggleRawEditor ? (
        <Pressable
          accessibilityLabel={mobileText('editor.toolbar.rawOpen')}
          accessibilityRole="button"
          style={({ pressed }) => [
            quickActionStyles.button,
            pressed && quickActionStyles.buttonPressed,
          ]}
          testID="properties-action-source-mode"
          onPress={onToggleRawEditor}
        >
          <Code color={mobileColors.textMuted} size={18} />
        </Pressable>
      ) : null}
    </View>
  )
}

function PropertyAccordionSection({
  children,
  count,
  expanded,
  onToggle,
  testID,
  title,
}: {
  children: ReactNode
  count?: number
  expanded: boolean
  onToggle: () => void
  testID?: string
  title: string
}) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const mobileColors = useMobileColors()
  const { propertyStyles } = themeStyles
  const CaretIcon = expanded ? CaretDown : CaretRight

  return (
    <View style={propertyStyles.accordionSection} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={propertyStyles.accordionHeader}
        testID={testID ? `${testID}-header` : undefined}
        onPress={onToggle}
      >
        <CaretIcon color={mobileColors.textMuted} size={12} weight="bold" />
        <Text style={propertyStyles.accordionTitle}>{title}</Text>
        {count !== undefined && count > 0 ? (
          <View style={propertyStyles.accordionBadge}>
            <Text style={propertyStyles.accordionBadgeText}>{count}</Text>
          </View>
        ) : null}
      </Pressable>
      {expanded ? <View style={propertyStyles.accordionBody}>{children}</View> : null}
    </View>
  )
}

function StandardPropertyRows({ missingTypeName, props }: { missingTypeName: string | null; props: NotePropertiesProps }) {
  const { layoutProbe, note, onCreateMissingType, onEditProperty, onOpenChangeNoteType } = props
  const mobileColors = useMobileColors()

  return (
    <>
      <TypePropertyRow
        icon={<Shapes color={mobileColors.textMuted} size={14} />}
        layoutProbe={layoutProbe}
        missingTypeName={missingTypeName}
        note={note}
        onCreateMissingType={onCreateMissingType}
        onOpenChangeNoteType={onOpenChangeNoteType}
      />
      {note.status ? (
        <MobilePropertyRow
          icon={<CircleIcon color={mobileColors.textMuted} size={14} />}
          label={mobileText('noteList.sort.status')}
          layoutProbe={layoutProbe}
          layoutProbeId="properties.row.status"
          testID="property-row-status"
          value={
            <EditableChipValue
              label={note.status}
              testID="property-row-status-edit"
              tone={statusTone(note.status)}
              onPress={() => onEditProperty(note.id, 'Status', note.status)}
            />
          }
        />
      ) : null}
      <MobilePropertyRow
        icon={<Tag color={mobileColors.textMuted} size={14} />}
        label="Tags"
        layoutProbe={layoutProbe}
        layoutProbeId="properties.section.tags"
        testID="property-section-tags"
        value={<EditableTagsValue labels={note.tags} onPress={() => onEditProperty(note.id, 'tags', note.tags)} />}
      />
    </>
  )
}

function NoteInfoPropertyRows({ props }: { props: NotePropertiesProps }) {
  const {
    layoutProbe,
    note,
    onCopyDeepLink,
    onCopyFilePath,
    onDeleteNote,
    onExportNoteAsPdf,
    onOpenMoveNoteToFolder,
    onOpenRenameNoteFile,
    onRenameNoteFileToTitle,
  } = props
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { quickActionStyles } = themeStyles
  const mobileColors = useMobileColors()

  const notePath = note.path ?? note.id ?? ''
  const pathParts = notePath.split('/').filter(Boolean)
  const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '/'
  const stem = pathParts.at(-1)?.replace(/\.md$/u, '') ?? ''

  return (
    <>
      {note.path ? (
        <MobilePropertyRow
          icon={<Copy color={mobileColors.textMuted} size={14} />}
          label={mobileText('editor.toolbar.copyFilePath')}
          layoutProbe={layoutProbe}
          layoutProbeId="properties.row.file-path"
          testID="property-row-file-path"
          value={note.path}
          onPress={onCopyFilePath}
        />
      ) : null}
      {onOpenMoveNoteToFolder ? (
        <MobilePropertyRow
          icon={<Folder color={mobileColors.textMuted} size={14} />}
          label={mobileText('command.note.moveToFolder')}
          layoutProbe={layoutProbe}
          layoutProbeId="properties.row.move-folder"
          testID="property-action-move-folder"
          value={folder}
          onPress={onOpenMoveNoteToFolder}
        />
      ) : null}
      {onOpenRenameNoteFile ? (
        <MobilePropertyRow
          icon={<PencilSimple color={mobileColors.textMuted} size={14} />}
          label={mobileText('editor.filename.rename')}
          layoutProbe={layoutProbe}
          layoutProbeId="properties.row.rename-file"
          testID="property-action-rename-file"
          value={stem}
          onPress={onOpenRenameNoteFile}
        />
      ) : null}
      {onRenameNoteFileToTitle && note.title && stem && note.title !== stem ? (
        <PropertyActionRow
          label={mobileText('editor.filename.renameToTitle')}
          layoutProbe={layoutProbe}
          layoutProbeId="properties.action.rename-to-title"
          testID="property-action-rename-to-title"
          onPress={onRenameNoteFileToTitle}
        />
      ) : null}
      {onCopyDeepLink ? (
        <PropertyActionRow
          label={mobileText('command.note.copyDeepLink')}
          layoutProbe={layoutProbe}
          layoutProbeId="properties.action.copy-deep-link"
          testID="property-action-copy-deep-link"
          onPress={onCopyDeepLink}
        />
      ) : null}
      {onExportNoteAsPdf ? (
        <PropertyActionRow
          label={mobileText('command.note.exportPdf')}
          layoutProbe={layoutProbe}
          layoutProbeId="properties.action.export-pdf"
          testID="property-action-export-pdf"
          onPress={onExportNoteAsPdf}
        />
      ) : null}
      <MobilePropertyRow
        icon={<CalendarBlank color={mobileColors.textMuted} size={14} />}
        label={mobileText('noteList.sort.created')}
        layoutProbe={layoutProbe}
        layoutProbeId="properties.row.created"
        testID="property-row-created"
        value={note.created}
      />
      <MobilePropertyRow
        icon={<Clock color={mobileColors.textMuted} size={14} />}
        label={mobileCopy.modified}
        layoutProbe={layoutProbe}
        layoutProbeId="properties.row.modified"
        testID="property-row-modified"
        value={note.modified}
      />
      <MobilePropertyRow
        icon={<Folder color={mobileColors.textMuted} size={14} />}
        label={mobileText('inspector.properties.workspace')}
        layoutProbe={layoutProbe}
        layoutProbeId="properties.row.workspace"
        testID="property-row-workspace"
        value={<WorkspaceBadge label={note.workspace} />}
      />
      <MobilePropertyRow
        icon={<LinkSimple color={mobileColors.textMuted} size={14} />}
        label="Links"
        layoutProbe={layoutProbe}
        layoutProbeId="properties.row.links"
        testID="property-row-links"
        value={`${note.links}`}
      />
      {onDeleteNote ? (
        <Pressable
          accessibilityLabel={mobileText('command.note.deleteNote')}
          accessibilityRole="button"
          style={({ pressed }) => [
            quickActionStyles.deleteButton,
            pressed && quickActionStyles.deleteButtonPressed,
          ]}
          testID="workspace-action-delete-note"
          onPress={onDeleteNote}
        >
          <Trash color={mobileColors.danger} size={16} />
          <Text style={quickActionStyles.deleteText}>
            {mobileText('command.note.deleteNote')}
          </Text>
        </Pressable>
      ) : null}
    </>
  )
}

function CustomPropertyRows({ propertySlots, props }: { propertySlots: MobileInspectorPropertySlot[]; props: NotePropertiesProps }) {
  const { layoutProbe, note, onEditProperty, propertyDisplayModes } = props

  return (
    <>
      {note.icon ? (
        <EditablePropertyRow
          layoutProbe={layoutProbe}
          noteId={note.id}
          property={{ key: 'icon', label: 'Icon', value: note.icon }}
          onEditProperty={onEditProperty}
        />
      ) : null}
      {note.properties?.map((property) => (
        <EditablePropertyRow
          key={property.key}
          layoutProbe={layoutProbe}
          noteId={note.id}
          property={property}
          propertyDisplayModes={propertyDisplayModes}
          onEditProperty={onEditProperty}
        />
      ))}
      <InspectorPlaceholderRows propertySlots={propertySlots} props={props} />
    </>
  )
}

function RelationshipPropertyRows({ relationshipSlots, props }: { relationshipSlots: MobileInspectorRelationshipSlot[]; props: NotePropertiesProps }) {
  const { layoutProbe, note, onAddRelationship, onEnterNeighborhood, onRemoveRelationship, onSelectNote, typeDefinitions } = props

  return (
    <>
      {note.relationships.map((relationship) => (
        <PropertySection
          key={`${relationship.kind}-${relationship.label ?? relationship.values.map((value) => value.title).join('-')}`}
          label={relationshipHeading(relationship)}
          layoutProbe={layoutProbe}
          layoutProbeId={`properties.section.${testIdSegment(relationshipHeading(relationship))}`}
          testID={`property-section-${relationship.kind}`}
        >
          <RelationshipValues
            layoutProbe={layoutProbe}
            noteId={note.id}
            relationship={relationship}
            onRemoveRelationship={onRemoveRelationship}
            onEnterNeighborhood={onEnterNeighborhood}
            typeDefinitions={typeDefinitions}
            onSelectNote={onSelectNote}
          />
          <PropertyActionRow
            label={mobileText('inspector.relationship.add')}
            testID={`relationship-add-${testIdSegment(relationship.key ?? relationshipHeading(relationship))}`}
            onPress={() => onAddRelationship(relationship.key ?? relationshipHeading(relationship))}
          />
        </PropertySection>
      ))}
      <InspectorPlaceholderRows relationshipSlots={relationshipSlots} props={props} />
    </>
  )
}

function InspectorPlaceholderRows({ propertySlots = [], relationshipSlots = [], props }: {
  propertySlots?: MobileInspectorPropertySlot[]
  relationshipSlots?: MobileInspectorRelationshipSlot[]
  props: NotePropertiesProps
}) {
  return <>
    {propertySlots.map((slot) => (
      <PlaceholderPropertyRow key={`${slot.source}:${slot.key}`} layoutProbe={props.layoutProbe} slot={slot} onPress={() => props.onAddProperty(slot.key)} />
    ))}
    {relationshipSlots.map((slot) => (
      <PlaceholderRelationshipSection key={`${slot.source}:${slot.key}`} layoutProbe={props.layoutProbe} slot={slot} onPress={() => props.onAddRelationship(slot.key)} />
    ))}
  </>
}

function PropertyActionsAndReferences({ props }: { props: NotePropertiesProps }) {
  const { layoutProbe, onAddRelationship, onSelectNote, referenceGroups, typeDefinitions } = props

  return (
    <>
      <PropertyActionRow label={mobileText('mobile.properties.addRelationships')} layoutProbe={layoutProbe} layoutProbeId="properties.action.add-relationship" testID="property-action-add-relationship" onPress={() => onAddRelationship()} />
      <ReferenceGroups groups={referenceGroups} layoutProbe={layoutProbe} typeDefinitions={typeDefinitions} onSelectNote={onSelectNote} />
    </>
  )
}

function TypePropertyRow({
  icon,
  layoutProbe,
  missingTypeName,
  note,
  onCreateMissingType,
  onOpenChangeNoteType,
}: {
  icon?: ReactNode
  layoutProbe: MobileLayoutProbe
  missingTypeName: string | null
  note: MobileNote
  onCreateMissingType: (typeName: string) => void
  onOpenChangeNoteType: () => void
}) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { typeStyles } = themeStyles
  return (
    <MobilePropertyRow
      icon={icon}
      label="Type"
      testID="property-row-type"
      value={
        <View style={typeStyles.value}>
          <EditableChipValue
            label={note.type}
            testID="property-row-type-edit"
            tone={chipTone(note.typeTone)}
            onPress={onOpenChangeNoteType}
          />
          {missingTypeName ? (
            <MissingTypeButton typeName={missingTypeName} onPress={() => onCreateMissingType(missingTypeName)} />
          ) : null}
        </View>
      }
      layoutProbe={layoutProbe}
      layoutProbeId="properties.row.type"
    />
  )
}

function MissingTypeButton({ onPress, typeName }: { onPress: () => void; typeName: string }) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { typeStyles } = themeStyles
  const mobileColors = useMobileColors()
  const label = mobileText('inspector.properties.missingTypeAria').replace('{type}', typeName)

  return (
    <Pressable
      accessibilityHint={mobileText('sidebar.action.createType')}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={typeStyles.missingButton}
      testID="missing-type-warning"
      onPress={onPress}
    >
      <WarningCircle color={mobileColors.orange} size={14} weight="bold" />
      <Text numberOfLines={1} style={typeStyles.missingText}>
        {mobileText('inspector.properties.missingType')}
      </Text>
    </Pressable>
  )
}

function PropertiesEmptyState() {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { emptyStateStyles } = themeStyles
  return (
    <View style={emptyStateStyles.emptyState}>
      <Text style={emptyStateStyles.emptyTitle}>{mobileText('inspector.empty.noNoteSelected')}</Text>
      <Text style={emptyStateStyles.emptyText}>{mobileText('inspector.empty.noProperties')}</Text>
    </View>
  )
}

function PlaceholderPropertyRow({
  layoutProbe,
  onPress,
  slot,
}: {
  layoutProbe: MobileLayoutProbe
  onPress: () => void
  slot: MobileInspectorPropertySlot
}) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const colors = useMobileColors()
  const { propertyStyles } = themeStyles
  const sourceSegment = slot.source === 'typeDerived' ? 'type-derived' : 'suggested'
  const testID = `property-placeholder-${sourceSegment}-${testIdSegment(slot.key)}`

  return (
    <MobilePropertyRow
      accessibilityLabel={slot.label}
      label={slot.label}
      layoutProbe={layoutProbe}
      layoutProbeId={`properties.placeholder.${testIdSegment(slot.key)}`}
      testID={testID}
      onPress={onPress}
      value={
        <View pointerEvents="none" style={propertyStyles.placeholderAddValue} testID={`${testID}-add`}>
          <Plus size={18} color={colors.textFaint} />
        </View>
      }
    />
  )
}

function PlaceholderRelationshipSection({
  layoutProbe,
  onPress,
  slot,
}: {
  layoutProbe: MobileLayoutProbe
  onPress: () => void
  slot: MobileInspectorRelationshipSlot
}) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { propertyStyles, actionStyles } = themeStyles
  const mobileColors = useMobileColors()
  const sourceSegment = slot.source === 'typeDerived' ? 'type-derived' : 'suggested'
  const testID = `relationship-placeholder-${sourceSegment}-${testIdSegment(slot.key)}`

  return (
    <PropertySection
      label={slot.label}
      labelVariant="placeholder"
      layoutProbe={layoutProbe}
      layoutProbeId={`properties.relationship-placeholder.${testIdSegment(slot.key)}`}
      testID={testID}
    >
      <Pressable
        accessibilityLabel={mobileText('inspector.relationship.add')}
        accessibilityRole="button"
        style={propertyStyles.placeholderRelationshipButton}
        testID={`${testID}-add`}
        onPress={onPress}
      >
        <View style={actionStyles.label}>
          <View style={actionStyles.iconSlot}>
            <Plus color={mobileColors.textFaint} size={14} />
          </View>
          <Text numberOfLines={1} style={[actionStyles.text, propertyStyles.placeholderButtonText]}>
            {mobileInspectorPlaceholderActionLabel('relationship')}
          </Text>
        </View>
      </Pressable>
    </PropertySection>
  )
}
