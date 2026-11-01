import type { MobileMetrics } from '../../ui/mobileMetrics'
import { StyleSheet } from 'react-native'

import { mobileRadius } from '../../ui/tokens'
import {
  mobileInspectorPlaceholderRowLayoutContract,
  mobileInspectorReferenceRowLayoutContract,
} from './MobilePropertiesPanelModel'
import type { MobileColors } from '../../ui/theme/mobilePalette'

export function createPropertyPanelStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  return {
    panelStyles: createPanelStyles(metrics),
    emptyStateStyles: createEmptyStateStyles(mobileColors, metrics),
    relationshipStyles: createRelationshipStyles(metrics),
    referenceStyles: createReferenceStyles(mobileColors, metrics),
    propertyStyles: {
      ...createSectionStyles(mobileColors, metrics),
      ...createPlaceholderButtonStyles(metrics),
      ...createPlaceholderValueStyles(mobileColors, metrics),
      ...createEditableValueStyles(mobileColors, metrics),
      ...createEditableTextStyles(mobileColors, metrics),
    },
    typeStyles: createTypeStyles(mobileColors, metrics),
    propertyDisplayStyles: createPropertyDisplayStyles(mobileColors, metrics),
    actionStyles: createActionStyles(mobileColors, metrics),
    quickActionStyles: createQuickActionStyles(mobileColors, metrics),
  }
}

function createPanelStyles(metrics: MobileMetrics) {
  const { property: desktopPropertyParity, panel: desktopPanelParity } = metrics
  return StyleSheet.create({
    content: { padding: desktopPropertyParity.panelPadding },
    emptyContent: { flexGrow: 1 },
    panel: {
      alignSelf: 'stretch',
      borderLeftWidth: StyleSheet.hairlineWidth,
      height: '100%',
      width: desktopPanelParity.inspectorWidth,
    },
    panelCompact: { width: 280 },
    panelFullWidth: { width: '100%', height: 'auto', flex: 1, minHeight: 0 },
  })
}

function createEmptyStateStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, type: mobileType } = metrics
  return StyleSheet.create({
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: mobileSpace.xxl,
    },
    emptyText: {
      marginTop: mobileSpace.sm,
      color: mobileColors.textMuted,
      fontSize: mobileType.body,
      textAlign: 'center',
    },
    emptyTitle: {
      color: mobileColors.text,
      fontSize: mobileType.title,
      fontWeight: '600',
      textAlign: 'center',
    },
  })
}

function createRelationshipStyles(metrics: MobileMetrics) {
  const { property: desktopPropertyParity, relationship: desktopRelationshipParity } = metrics
  return StyleSheet.create({
    remove: {
      minHeight: 44,
      minWidth: 44,
      alignItems: 'flex-end',
      paddingRight: metrics.size(6),
      justifyContent: 'center',
      borderRadius: mobileRadius.pill,
    },
    row: {
      minHeight: Math.max(44, desktopPropertyParity.rowMinHeight),
      alignItems: 'center',
      flexDirection: 'row',
      borderRadius: desktopRelationshipParity.rowRadius,
      paddingHorizontal: desktopRelationshipParity.rowPaddingHorizontal,
      paddingRight: 0,
      paddingVertical: desktopRelationshipParity.rowPaddingVertical,
      width: '100%',
    },
    background: {
      position: 'absolute',
      top: 2,
      bottom: 2,
      left: 0,
      right: 0,
      borderRadius: desktopRelationshipParity.rowRadius,
    },
    openTarget: {
      minHeight: 44,
      minWidth: 0,
      flex: 1,
      alignItems: 'center',
      flexDirection: 'row',
      gap: desktopRelationshipParity.rowGap,
    },
    text: {
      flex: 1,
      fontSize: desktopRelationshipParity.textFontSize,
      fontWeight: desktopRelationshipParity.textFontWeight,
    },
    values: { alignItems: 'stretch', gap: 0 },
  })
}

function createReferenceStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, relationship: desktopRelationshipParity } = metrics
  return StyleSheet.create({
    container: {
      marginTop: mobileSpace.sm,
      borderTopColor: mobileColors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    row: {
      minHeight: metrics.size(mobileInspectorReferenceRowLayoutContract.minHeight),
      minWidth: 0,
      alignItems: 'center',
      flexDirection: 'row',
      gap: desktopRelationshipParity.rowGap,
      borderRadius: mobileInspectorReferenceRowLayoutContract.radius,
      paddingHorizontal: metrics.size(mobileInspectorReferenceRowLayoutContract.paddingHorizontal),
      paddingVertical: metrics.size(mobileInspectorReferenceRowLayoutContract.paddingVertical),
      width: '100%',
    },
    text: {
      minWidth: 0,
      flex: 1,
      fontSize: metrics.size(mobileInspectorReferenceRowLayoutContract.textFontSize),
      fontWeight: mobileInspectorReferenceRowLayoutContract.textFontWeight,
    },
  })
}

function createTypeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { property: desktopPropertyParity, space: mobileSpace } = metrics
  return StyleSheet.create({
    value: {
      minWidth: 0,
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: mobileSpace.xs,
      justifyContent: 'flex-end',
    },
    missingButton: {
      minHeight: desktopPropertyParity.chipHeight,
      alignItems: 'center',
      flexDirection: 'row',
      gap: metrics.size(3),
      borderRadius: desktopPropertyParity.chipRadius,
      backgroundColor: mobileColors.orangeSoft,
      paddingHorizontal: desktopPropertyParity.chipPaddingHorizontal,
    },
    missingText: {
      color: mobileColors.orange,
      fontSize: desktopPropertyParity.chipTextSize,
      fontWeight: '500',
      lineHeight: desktopPropertyParity.chipHeight,
    },
  })
}

function createPropertyDisplayStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace } = metrics
  return StyleSheet.create({
    colorSwatch: {
      height: 12,
      width: 12,
      borderColor: mobileColors.borderStrong,
      borderRadius: mobileRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
    },
    colorValue: {
      minWidth: 0,
      alignItems: 'center',
      flexShrink: 1,
      flexDirection: 'row',
      gap: mobileSpace.xs,
      justifyContent: 'flex-end',
    },
    listValue: {
      minWidth: 0,
      alignItems: 'center',
      flexShrink: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: mobileSpace.xs,
      justifyContent: 'flex-end',
    },
    numberText: { fontVariant: ['tabular-nums'] },
    urlText: { color: mobileColors.primary },
  })
}

function createActionStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { property: desktopPropertyParity, space: mobileSpace } = metrics
  return StyleSheet.create({
    iconSlot: {
      width: desktopPropertyParity.labelIconSlot,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      minWidth: 0,
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: mobileSpace.xs,
      marginRight: mobileSpace.sm,
      zIndex: 1,
    },
    row: {
      height: desktopPropertyParity.rowMinHeight,
      minHeight: desktopPropertyParity.rowMinHeight,
      flexShrink: 0,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 0,
      alignSelf: 'stretch',
      borderRadius: desktopPropertyParity.actionRowRadius,
      paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
      position: 'relative',
    },
    text: {
      minWidth: 0,
      flex: 1,
      color: mobileColors.textFaint,
      fontSize: desktopPropertyParity.labelTextSize,
    },
    value: { flex: 1, zIndex: 1 },
  })
}

function createSectionStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { property: desktopPropertyParity, space: mobileSpace } = metrics
  return StyleSheet.create({
    accordionBadge: {
      alignItems: 'center',
      backgroundColor: mobileColors.control,
      borderRadius: mobileRadius.pill,
      justifyContent: 'center',
      paddingHorizontal: metrics.size(6),
      paddingVertical: metrics.size(1),
    },
    accordionBadgeText: {
      color: mobileColors.textMuted,
      fontSize: metrics.size(10),
      fontWeight: '600',
    },
    accordionBody: {
      width: '100%',
    },
    accordionHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: mobileSpace.xs,
      paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
      paddingVertical: metrics.size(7),
    },
    accordionSection: {
      marginBottom: mobileSpace.xs,
    },
    accordionTitle: {
      color: mobileColors.textMuted,
      flex: 1,
      fontSize: metrics.size(11),
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    relationshipGroup: {
      marginTop: mobileSpace.sm,
      paddingTop: mobileSpace.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: mobileColors.border,
    },
    sectionLabel: {
      color: mobileColors.textMuted,
      fontSize: desktopPropertyParity.labelTextSize,
    },
    sectionRow: {
      minHeight: desktopPropertyParity.rowMinHeight,
      borderBottomColor: mobileColors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: mobileSpace.sm,
      paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
      paddingVertical: mobileSpace.sm,
    },
    sectionValue: { alignSelf: 'stretch', minWidth: 0 },
  })
}

function createPlaceholderButtonStyles(metrics: MobileMetrics) {
  const { property: desktopPropertyParity, space: mobileSpace, relationship: desktopRelationshipParity } = metrics
  return StyleSheet.create({
    placeholderButton: {
      minHeight: desktopPropertyParity.rowMinHeight,
      alignItems: 'center',
      alignSelf: 'stretch',
      flexDirection: 'row',
      gap: mobileSpace.xs,
      borderRadius: desktopPropertyParity.actionRowRadius,
      paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
      width: '100%',
    },
    placeholderRelationshipButton: {
      minHeight: desktopPropertyParity.rowMinHeight,
      alignItems: 'center',
      alignSelf: 'stretch',
      flexDirection: 'row',
      gap: mobileSpace.xs,
      borderRadius: desktopRelationshipParity.rowRadius,
      paddingHorizontal: 0,
      width: '100%',
    },
  })
}

function createPlaceholderValueStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { property: desktopPropertyParity, space: mobileSpace, type: mobileType } = metrics
  return StyleSheet.create({
    placeholderButtonText: {
      minWidth: 0,
      flex: 1,
      color: mobileColors.textFaint,
      fontSize: desktopPropertyParity.labelTextSize,
    },
    placeholderLabel: {
      color: mobileColors.textFaint,
      fontSize: desktopPropertyParity.labelTextSize,
    },
    placeholderAddValue: {
      minHeight: metrics.size(mobileInspectorPlaceholderRowLayoutContract.minHeight),
      minWidth: 0,
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: mobileSpace.xs,
      justifyContent: 'flex-end',
      borderRadius: 4,
      paddingHorizontal: mobileSpace.xs,
    },
    placeholderValue: {
      minWidth: 0,
      flex: 1,
      color: mobileColors.textFaint,
      fontSize: mobileType.caption,
      textAlign: 'right',
    },
  })
}

function createEditableValueStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { property: desktopPropertyParity, space: mobileSpace } = metrics
  return StyleSheet.create({
    emptyEditableValue: {
      minHeight: desktopPropertyParity.rowMinHeight,
      minWidth: 0,
      alignItems: 'center',
      alignSelf: 'stretch',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      borderRadius: 4,
      paddingHorizontal: mobileSpace.xs,
      paddingVertical: metrics.size(2),
    },
    editableValue: {
      maxHeight: 96,
      minWidth: 0,
      alignItems: 'center',
      flexDirection: 'row',
      gap: mobileSpace.xs,
      justifyContent: 'flex-end',
      borderRadius: 4,
      paddingHorizontal: mobileSpace.xs,
      paddingVertical: metrics.size(2),
      width: '100%',
    },
    editableValuePressed: { backgroundColor: mobileColors.graySoft },
  })
}

function createEditableTextStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, type: mobileType } = metrics
  return StyleSheet.create({
    editableText: {
      minWidth: 0,
      flexShrink: 1,
      color: mobileColors.text,
      fontSize: mobileType.caption,
    },
    emptyEditableText: {
      color: mobileColors.textFaint,
      fontSize: mobileType.caption,
    },
    tagWrap: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: mobileSpace.xs,
      justifyContent: 'flex-end',
    },
    tagsValue: { minWidth: 0, maxWidth: '100%', paddingVertical: mobileSpace.xs },
    workspaceBadge: {
      overflow: 'hidden',
      borderRadius: mobileRadius.pill,
      backgroundColor: mobileColors.graySoft,
      color: mobileColors.textMuted,
      fontSize: mobileType.micro,
      fontWeight: '400',
      paddingHorizontal: metrics.size(6),
      paddingVertical: metrics.size(2),
    },
  })
}

function createQuickActionStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace } = metrics
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: mobileSpace.xs,
      paddingVertical: mobileSpace.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: mobileColors.border,
      marginBottom: mobileSpace.sm,
      gap: metrics.size(4),
    },
    button: {
      flex: 1,
      maxWidth: 44,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: mobileColors.control,
    },
    buttonActive: {
      backgroundColor: mobileColors.primarySoft,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      borderRadius: 8,
      backgroundColor: mobileColors.dangerSoft,
      gap: mobileSpace.xs,
      marginTop: mobileSpace.md,
      paddingHorizontal: mobileSpace.sm,
    },
    deleteButtonPressed: {
      opacity: 0.8,
    },
    deleteText: {
      color: mobileColors.danger,
      fontSize: metrics.type.caption,
      fontWeight: '600',
    },
  })
}
