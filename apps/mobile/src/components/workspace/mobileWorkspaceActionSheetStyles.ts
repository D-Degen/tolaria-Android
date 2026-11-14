import { StyleSheet } from 'react-native'
import type { MobileMetrics } from '../../ui/mobileMetrics'
import type { MobileColors } from '../../ui/theme/mobilePalette'
import { mobileRadius } from '../../ui/tokens'
import { mobileActionSheetLayoutContract, mobileWorkspaceSuggestionRowLayoutContract } from './MobileWorkspaceActionSheetModel'

const fixedStyles = StyleSheet.create({
  formBody: { flexShrink: 1, minHeight: 0 },
  overlay: { ...StyleSheet.absoluteFill, elevation: 1000, zIndex: 1000 },
  scrollArea: { flexShrink: 1, minHeight: 0 },
  suggestionPressable: { alignSelf: 'stretch', width: '100%' },
})

export function createMobileWorkspaceSheetStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const styles = {
    ...fixedStyles,
    ...createFormStyles(mobileColors, metrics),
    ...createSuggestionStyles(mobileColors, metrics),
    ...createVisibilityStyles(mobileColors, metrics),
  }
  const sheetStyles = createSheetStyles(mobileColors)
  const actionStyles = createActionStyles(mobileColors, metrics)
  return { mobileColors, styles, sheetStyles, actionStyles }
}

function createFormStyles(colors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
    content: {
      alignSelf: 'stretch',
      gap: metrics.size(mobileActionSheetLayoutContract.contentGap),
      padding: metrics.size(mobileActionSheetLayoutContract.contentPadding),
    },
    footer: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: metrics.space.sm,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: metrics.space.md,
    },
    sheetContainer: {
      flex: 1,
      minHeight: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: metrics.size(mobileActionSheetLayoutContract.overlayPaddingHorizontal),
      paddingVertical: metrics.size(mobileActionSheetLayoutContract.overlayPaddingVertical),
    },
    pinnedFooter: {
      paddingBottom: metrics.size(mobileActionSheetLayoutContract.footerPaddingBottom),
      paddingHorizontal: metrics.size(mobileActionSheetLayoutContract.footerPaddingHorizontal),
    },
  })
}

function createSuggestionStyles(colors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    suggestionList: { gap: metrics.space.xs },
    suggestionRow: {
      minHeight: metrics.size(mobileWorkspaceSuggestionRowLayoutContract.minHeight),
      alignItems: 'center',
      flexDirection: 'row',
      gap: metrics.size(mobileWorkspaceSuggestionRowLayoutContract.gap),
      backgroundColor: colors.control,
      borderColor: colors.border,
      borderRadius: mobileWorkspaceSuggestionRowLayoutContract.radius,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: metrics.size(mobileWorkspaceSuggestionRowLayoutContract.paddingHorizontal),
      paddingVertical: metrics.size(mobileWorkspaceSuggestionRowLayoutContract.paddingVertical),
    },
    suggestionRowPressed: { backgroundColor: colors.graySoft },
    suggestionTitle: {
      minWidth: 0,
      flex: 1,
      color: colors.text,
      fontSize: metrics.type.body,
      fontWeight: '500',
    },
  })
}

function createVisibilityStyles(colors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    visibilityDescription: {
      color: colors.textMuted,
      fontSize: metrics.type.caption,
      lineHeight: metrics.size(16),
    },
    visibilityHeader: { gap: metrics.space.xs },
    visibilityLabel: {
      color: colors.text,
      fontSize: metrics.type.body,
      fontWeight: '500',
    },
    visibilityRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: metrics.space.sm,
      borderRadius: 6,
      padding: metrics.space.sm,
    },
    visibilityRowPressed: { backgroundColor: colors.control },
    visibilitySection: {
      gap: metrics.space.xs,
      borderColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: metrics.space.md,
    },
    visibilityText: { minWidth: 0, flex: 1, gap: metrics.size(2) },
    visibilityTitle: {
      color: colors.textMuted,
      fontSize: metrics.type.caption,
      fontWeight: '500',
    },
  })
}

function createSheetStyles(colors: MobileColors) {
  return StyleSheet.create({
    sheet: {
      flexShrink: 1,
      minHeight: 0,
      maxHeight: mobileActionSheetLayoutContract.sheetMaxHeight,
      maxWidth: mobileActionSheetLayoutContract.sheetMaxWidth,
      width: '100%',
      backgroundColor: colors.card,
      borderColor: colors.borderStrong,
      borderRadius: mobileRadius.lg,
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

function createActionStyles(colors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    actionRow: {
      minWidth: 0,
      alignSelf: 'stretch',
      width: '100%',
      borderRadius: 4,
      paddingHorizontal: metrics.space.sm,
      paddingVertical: metrics.space.sm,
    },
    actionIcon: { width: metrics.toolbarAction.iconSize, alignItems: 'center' },
    actionRowContent: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.space.sm,
    },
    actionRowPressed: { backgroundColor: colors.control },
    actionText: {
      minWidth: 0,
      flex: 1,
      flexShrink: 1,
      color: colors.text,
      fontSize: metrics.type.body,
    },
    actionTextDestructive: { color: colors.red },
  })
}
