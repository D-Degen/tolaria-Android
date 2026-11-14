import { useEffect } from 'react'
import { AccessibilityInfo, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { mobileText } from '../../i18n/mobileText'
import { MobileButton } from '../../ui/MobileButton'
import type { MobileColors } from '../../ui/theme/mobilePalette'
import type { MobileMetrics } from '../../ui/mobileMetrics'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import { Text } from '../ui/text'

export function MobileWorkspaceEditNotice({ retry }: { retry?: () => void }) {
  const styles = useMobileStyles(createStyles)
  const { top } = useSafeAreaInsets()
  const failed = Boolean(retry)
  useEffect(() => {
    if (failed) AccessibilityInfo.announceForAccessibility(mobileText('mobile.editor.readFailed'))
  }, [failed])
  if (!retry) return null
  return <View pointerEvents="box-none" style={[styles.position, { top: top + 8 }]}>
    <View style={styles.notice} testID="workspace-edit-notice">
      <Text accessibilityLiveRegion="polite" style={styles.message}>{mobileText('mobile.editor.readFailed')}</Text>
      <MobileButton label={mobileText('pulse.retry')} onPress={retry} testID="workspace-edit-retry" variant="ghost" />
    </View>
  </View>
}

function createStyles(colors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    position: { position: 'absolute', left: 12, right: 12, zIndex: 20, alignItems: 'center' },
    notice: { width: '100%', maxWidth: 520, flexDirection: 'row', alignItems: 'center', gap: metrics.size(8),
      padding: metrics.size(12), borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.popover, elevation: 4 },
    message: { flex: 1, color: colors.text, fontSize: metrics.size(13), lineHeight: metrics.size(19) },
  })
}
