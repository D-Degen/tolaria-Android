import { useState, type ReactNode } from 'react'
import { useMobileStyles, useMobileColors } from '../../ui/theme/useMobileTheme'
import {
  CalendarBlank,
  CaretDown,
  CaretRight,
  CircleIcon,
  Clock,
  Folder,
  LinkSimple,
  Plus,
  Shapes,
  Tag,
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

  return (
    <>
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
  const { layoutProbe, note } = props
  const mobileColors = useMobileColors()

  return (
    <>
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
