import { StyleSheet } from 'react-native'
import type { MobileMetrics } from '../../ui/mobileMetrics'
import type { MobileColors } from '../../ui/theme/mobilePalette'
import { mobileCommandPaletteLayoutContract } from './MobileCommandPaletteLayout'

export function createCommandPaletteStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const styles = StyleSheet.create({
    ...createInputStyles(mobileColors, metrics),
    ...createResultsStyles(mobileColors, metrics),
    ...createRowStyles(mobileColors, metrics),
  })
  return { mobileColors, styles, surfaceStyles: createSurfaceStyles(mobileColors, metrics) }
}

function createInputStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, type: mobileType } = metrics
  return StyleSheet.create({
    emptyState: {
      minHeight: metrics.size(mobileCommandPaletteLayoutContract.emptyMinHeight),
      alignItems: 'center',
      justifyContent: 'center',
      padding: mobileSpace.lg,
    },
    emptyText: {
      color: mobileColors.textMuted,
      fontSize: mobileType.body,
    },
    input: {
      minHeight: metrics.size(mobileCommandPaletteLayoutContract.inputMinHeight),
      borderBottomColor: mobileColors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderRadius: 0,
      borderWidth: 0,
      color: mobileColors.text,
      fontSize: metrics.size(mobileCommandPaletteLayoutContract.inputTextSize),
      paddingHorizontal: metrics.size(mobileCommandPaletteLayoutContract.inputPaddingHorizontal),
      paddingVertical: metrics.size(mobileCommandPaletteLayoutContract.inputPaddingVertical),
    },
    footer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: mobileSpace.md,
      borderTopColor: mobileColors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: metrics.size(mobileCommandPaletteLayoutContract.footerPaddingHorizontal),
      paddingVertical: metrics.size(mobileCommandPaletteLayoutContract.footerPaddingVertical),
    },
    footerText: {
      color: mobileColors.textMuted,
      fontSize: mobileType.micro,
    },
  })
}

function createResultsStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace } = metrics
  return StyleSheet.create({
    groupLabel: {
      color: mobileColors.textMuted,
      fontSize: metrics.size(11),
      fontWeight: '500',
      lineHeight: metrics.size(14),
      paddingBottom: metrics.size(mobileCommandPaletteLayoutContract.groupLabelPaddingBottom),
      paddingHorizontal: metrics.size(mobileCommandPaletteLayoutContract.groupLabelPaddingHorizontal),
      paddingTop: metrics.size(mobileCommandPaletteLayoutContract.groupLabelPaddingTop),
    },
    group: {
      alignSelf: 'stretch',
      width: '100%',
    },
    results: {
      alignItems: 'stretch',
      paddingBottom: mobileSpace.sm,
      paddingTop: mobileSpace.xs,
      width: '100%',
    },
    resultsScroll: {
      flexShrink: 1,
      minHeight: 0,
      alignSelf: 'stretch',
      width: '100%',
    },
  })
}

function createRowStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace } = metrics
  return StyleSheet.create({
    row: {
      alignItems: 'center',
      alignSelf: 'stretch',
      borderRadius: mobileCommandPaletteLayoutContract.rowBorderRadius,
      flexDirection: 'row',
      gap: mobileSpace.sm,
      justifyContent: 'space-between',
      minHeight: metrics.size(mobileCommandPaletteLayoutContract.rowMinHeight),
      paddingHorizontal: metrics.size(mobileCommandPaletteLayoutContract.rowPaddingHorizontal),
      paddingVertical: metrics.size(mobileCommandPaletteLayoutContract.rowPaddingVertical),
      width: '100%',
    },
    rowPressable: {
      alignSelf: 'stretch',
      marginHorizontal: metrics.size(mobileCommandPaletteLayoutContract.rowMarginHorizontal),
      width: 'auto',
    },
    rowLabel: {
      flex: 1,
      minWidth: 0,
      color: mobileColors.text,
      fontSize: metrics.size(mobileCommandPaletteLayoutContract.rowTextSize),
      lineHeight: metrics.size(18),
    },
    rowPressed: {
      opacity: 0.78,
    },
    rowSelected: {
      backgroundColor: mobileColors.control,
    },
    shortcut: {
      color: mobileColors.textMuted,
      fontSize: metrics.size(mobileCommandPaletteLayoutContract.shortcutTextSize),
      lineHeight: metrics.size(16),
    },
  })
}

function createSurfaceStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: mobileColors.overlay,
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 30,
    },
    paletteContainer: {
      flex: 1,
      minHeight: 0,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: metrics.size(mobileCommandPaletteLayoutContract.overlayPaddingTop),
    },
    palette: {
      flexShrink: 1,
      minHeight: 0,
      maxHeight: mobileCommandPaletteLayoutContract.paletteMaxHeight,
      maxWidth: mobileCommandPaletteLayoutContract.paletteMaxWidth,
      width: '92%',
      backgroundColor: mobileColors.card,
      borderColor: mobileColors.borderStrong,
      borderRadius: mobileCommandPaletteLayoutContract.paletteBorderRadius,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
      elevation: 8,
      shadowColor: '#000000',
      shadowOffset: { height: 10, width: 0 },
      shadowOpacity: 0.14,
      shadowRadius: 28,
    },
  })
}

