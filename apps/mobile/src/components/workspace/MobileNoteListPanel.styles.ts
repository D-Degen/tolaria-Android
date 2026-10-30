import { StyleSheet } from 'react-native'
import type { MobileMetrics } from '../../ui/mobileMetrics'
import type { MobileColors } from '../../ui/theme/mobilePalette'
import { mobileRadius } from '../../ui/tokens'
import { mobileNoteListCreateChrome } from './MobileNoteListPanelChrome'
import { mobilePaneFooterFrame } from './mobilePaneFooterLayout'

export function createActionStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const diameter = metrics.size(mobileNoteListCreateChrome.diameter)
  const smartDiameter = metrics.size(mobileNoteListCreateChrome.smartVoiceDiameter)
  const smartGap = metrics.size(mobileNoteListCreateChrome.smartVoiceGap)
  const inset = metrics.size(mobileNoteListCreateChrome.inset)
  const styles = StyleSheet.create({
    createAction: {
      position: 'absolute',
      right: inset,
      bottom: inset,
      width: diameter,
      height: diameter,
      borderRadius: diameter / 2,
      backgroundColor: mobileColors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      zIndex: 50,
      elevation: 6,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.27,
      shadowRadius: 4.65,
    },
    smartVoiceAction: {
      position: 'absolute',
      right: inset + (diameter - smartDiameter) / 2,
      bottom: inset + diameter + smartGap,
      width: smartDiameter,
      height: smartDiameter,
      borderRadius: smartDiameter / 2,
      backgroundColor: mobileColors.card,
      borderWidth: 1.5,
      borderColor: mobileColors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      zIndex: 50,
      elevation: 5,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 3.84,
    },
  })
  return {
    mobileColors,
    styles,
    createIconSize: metrics.size(mobileNoteListCreateChrome.iconSize),
    smartVoiceIconSize: metrics.size(mobileNoteListCreateChrome.smartVoiceIconSize),
  }
}

export function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const styles = {
    ...createContentStyles(mobileColors, metrics),
    ...createFilterStyles(mobileColors, metrics),
    ...createListStyles(mobileColors, metrics),
  }
  return { mobileColors, styles }
}

function createContentStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, type: mobileType } = metrics
  return StyleSheet.create({
    chipRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: mobileSpace.xs,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: mobileSpace.xl,
    },
    emptyAction: {
      marginTop: mobileSpace.lg,
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

function createFilterStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, type: mobileType } = metrics
  return StyleSheet.create({
    filterBar: {
      ...mobilePaneFooterFrame(),
      flexDirection: 'row',
      justifyContent: 'center',
      gap: mobileSpace.sm,
      borderTopColor: mobileColors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: mobileSpace.lg,
    },
    filterPill: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: metrics.size(6),
      minHeight: 44,
      borderRadius: mobileRadius.pill,
      paddingHorizontal: metrics.size(10),
      paddingVertical: metrics.size(4),
    },
    filterPillSelected: {
      backgroundColor: mobileColors.control,
    },
    filterPillText: {
      color: mobileColors.textMuted,
      fontSize: mobileType.caption,
      fontWeight: '500',
    },
    filterPillTextSelected: {
      color: mobileColors.text,
    },
    filterPillCount: {
      color: mobileColors.textFaint,
      fontSize: mobileType.micro,
      fontVariant: ['tabular-nums'],
    },
    filterPillCountSelected: {
      color: mobileColors.textMuted,
    },
  })
}

function createListStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, type: mobileType } = metrics
  return StyleSheet.create({
    groupCount: {
      color: mobileColors.textMuted,
      fontSize: mobileType.micro,
      fontWeight: '400',
      fontVariant: ['tabular-nums'],
    },
    groupHeader: {
      minHeight: 32,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: mobileColors.graySoft,
      paddingHorizontal: mobileSpace.lg,
    },
    groupLabel: {
      color: mobileColors.textMuted,
      fontSize: mobileType.micro,
      fontWeight: '500',
      textTransform: 'uppercase',
    },
    listBody: {
      flex: 1,
      minHeight: 0,
      position: 'relative',
    },
    listContent: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: metrics.size(mobileNoteListCreateChrome.diameter + mobileNoteListCreateChrome.inset * 2),
    },
    searchPill: {
      minHeight: 36,
      alignItems: 'center',
      flexDirection: 'row',
      gap: mobileSpace.sm,
      borderBottomColor: mobileColors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: mobileSpace.lg,
    },
    searchText: {
      flex: 1,
      color: mobileColors.text,
      fontSize: mobileType.body,
      fontWeight: '500',
    },
    toolbarTitleBlock: { minWidth: 0 },
  })
}
