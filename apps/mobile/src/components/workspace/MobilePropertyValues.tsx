import { useMobileColors, useMobileStyles } from '../../ui/theme/useMobileTheme'
import {
  CalendarBlank,
  CircleIcon,
  Hash,
  Link,
  ListBullets,
  Palette,
  Smiley,
  TextT,
  ToggleLeft,
} from 'phosphor-react-native'
import { Pressable, View } from 'react-native'
import { mobileText } from '../../i18n/mobileText'
import type { MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { MobileChip } from '../../ui/MobileChip'
import { MobilePropertyRow } from '../../ui/MobilePropertyRow'
import { type MobilePropertyDisplay, mobilePropertyDisplay } from '../../workspace/mobilePropertyDisplay'
import type { MobileProperty, MobilePropertyDisplayMode, MobilePropertyValue } from '../../workspace/mobileWorkspaceModel'
import { Text } from '../ui/text'
import { createPropertyPanelStyles } from './MobilePropertiesPanel.styles'
import { statusTone, tagTone } from './mobileWorkspaceTone'
import { testIdSegment } from './mobilePropertyRowModel'

export function EditableChipValue({
  label,
  onPress,
  testID,
  tone,
}: {
  label: string
  onPress: () => void
  testID: string
  tone: Parameters<typeof MobileChip>[0]['tone']
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" testID={testID} onPress={onPress}>
      <MobileChip label={label} tone={tone} />
    </Pressable>
  )
}

export function EditableTagsValue({ labels, onPress }: { labels: string[]; onPress: () => void }) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { propertyStyles } = themeStyles
  if (labels.length > 0) {
    return (
      <Pressable accessibilityLabel="Tags" accessibilityRole="button" style={propertyStyles.tagsValue} testID="property-tags-edit" onPress={onPress}>
        <TagWrap labels={labels} />
      </Pressable>
    )
  }

  return (
    <Pressable
      accessibilityLabel="Tags"
      accessibilityRole="button"
      style={propertyStyles.emptyEditableValue}
      testID="property-tags-edit"
      onPress={onPress}
    >
      <Text style={propertyStyles.emptyEditableText}>{'\u2014'}</Text>
    </Pressable>
  )
}

export function EditablePropertyRow({
  layoutProbe,
  noteId,
  onEditProperty,
  propertyDisplayModes,
  property,
}: {
  layoutProbe: MobileLayoutProbe
  noteId: string
  onEditProperty: (noteId: string, key: string, value: MobilePropertyValue) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  property: MobileProperty
}) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const mobileColors = useMobileColors()
  const { propertyStyles } = themeStyles
  const testId = `property-row-${testIdSegment(property.key)}`
  const display = mobilePropertyDisplay(
    property.key,
    property.value,
    {
      false: mobileText('inspector.properties.no'),
      true: mobileText('inspector.properties.yes'),
    },
    propertyDisplayModes,
  )
  const icon = propertyTypeIcon(property.key, display.kind, mobileColors.textMuted)

  return (
    <MobilePropertyRow
      icon={icon}
      label={property.label}
      layoutProbe={layoutProbe}
      layoutProbeId={`properties.row.${testIdSegment(property.key)}`}
      testID={testId}
      value={
        <Pressable
          accessibilityLabel={`${property.label}: ${display.text}`}
          accessibilityRole="button"
          style={propertyStyles.editableValue}
          testID={`${testId}-edit`}
          onPress={() => onEditProperty(noteId, property.key, property.value)}
        >
          <EditablePropertyValueDisplay display={display} />
        </Pressable>
      }
    />
  )
}

function propertyTypeIcon(key: string, kind: MobilePropertyDisplay['kind'], color: string) {
  if (key === 'icon') return <Smiley color={color} size={14} />
  switch (kind) {
    case 'number':
      return <Hash color={color} size={14} />
    case 'date':
      return <CalendarBlank color={color} size={14} />
    case 'boolean':
      return <ToggleLeft color={color} size={14} />
    case 'list':
      return <ListBullets color={color} size={14} />
    case 'color':
      return <Palette color={color} size={14} />
    case 'url':
      return <Link color={color} size={14} />
    case 'status':
      return <CircleIcon color={color} size={14} />
    default:
      return <TextT color={color} size={14} />
  }
}

function EditablePropertyValueDisplay({ display }: { display: MobilePropertyDisplay }) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { propertyDisplayStyles } = themeStyles
  if (display.kind === 'list' && display.listItems.length > 0) {
    return (
      <View style={propertyDisplayStyles.listValue}>
        {display.listItems.map((item) => (
          <MobileChip key={item} label={item} tone={tagTone(item)} />
        ))}
      </View>
    )
  }

  if (display.kind === 'status') {
    return <MobileChip label={display.text} tone={statusTone(display.text)} />
  }

  if (display.kind === 'color') {
    return <EditableColorValue colorValue={display.colorValue} text={display.text} />
  }

  return (
    <Text numberOfLines={1} style={editablePropertyTextStyle(themeStyles, display.kind)}>
      {display.text}
    </Text>
  )
}

function EditableColorValue({ colorValue, text }: { colorValue?: string; text: string }) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { propertyDisplayStyles, propertyStyles } = themeStyles
  return (
    <View style={propertyDisplayStyles.colorValue}>
      <View
        style={[
          propertyDisplayStyles.colorSwatch,
          colorValue ? { backgroundColor: colorValue } : null,
        ]}
      />
      <Text numberOfLines={1} style={propertyStyles.editableText}>
        {text}
      </Text>
    </View>
  )
}

function editablePropertyTextStyle(themeStyles: ReturnType<typeof createPropertyPanelStyles>, kind: MobilePropertyDisplay['kind']) {
  const { propertyStyles, propertyDisplayStyles } = themeStyles
  return [
    propertyStyles.editableText,
    kind === 'number' ? propertyDisplayStyles.numberText : null,
    kind === 'url' ? propertyDisplayStyles.urlText : null,
  ]
}

function TagWrap({ labels }: { labels: string[] }) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { propertyStyles } = themeStyles
  return (
    <View style={propertyStyles.tagWrap} testID="property-tags-wrap">
      {labels.map((label) => (
        <MobileChip key={label} label={label} tone={tagTone(label)} />
      ))}
    </View>
  )
}

export function WorkspaceBadge({ label }: { label: string }) {
  const themeStyles = useMobileStyles(createPropertyPanelStyles)
  const { propertyStyles } = themeStyles
  return <Text style={propertyStyles.workspaceBadge}>{label}</Text>
}
