import { StyleSheet } from 'react-native'
import type { MobileMetrics } from '../ui/mobileMetrics'
import type { MobileColors } from '../ui/theme/mobilePalette'

const fixedStyles = StyleSheet.create({
  drawerPanel: { height: '100%', borderRightWidth: StyleSheet.hairlineWidth },
  drawerRoot: { flex: 1, overflow: 'hidden', flexDirection: 'row' },
  drawerScrim: { flex: 1, height: '100%' },
  root: { flex: 1, overflow: 'hidden' },
  leadingActions: { alignItems: 'center', flexDirection: 'row' },
  screen: { flex: 1 },
  topBar: {
    minHeight: 44,
    alignItems: 'center',
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: { flex: 1, fontWeight: '600' },
})

export function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const styles = StyleSheet.create({
    ...fixedStyles,
    drawerPanel: {
      ...fixedStyles.drawerPanel,
      backgroundColor: mobileColors.sidebar,
      borderRightColor: mobileColors.border,
    },
    drawerRoot: { ...fixedStyles.drawerRoot, backgroundColor: mobileColors.sidebar },
    drawerScrim: { ...fixedStyles.drawerScrim, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
    root: { ...fixedStyles.root, backgroundColor: mobileColors.app },
    leadingActions: { ...fixedStyles.leadingActions, gap: metrics.space.xs },
    screen: { ...fixedStyles.screen, backgroundColor: mobileColors.app },
    topBar: {
      ...fixedStyles.topBar,
      gap: metrics.space.xs,
      borderBottomColor: mobileColors.border,
      backgroundColor: mobileColors.card,
      paddingHorizontal: metrics.space.sm,
    },
    topBarTitle: { ...fixedStyles.topBarTitle, color: mobileColors.text, fontSize: metrics.size(13) },
  })
  return { mobileColors, styles }
}
