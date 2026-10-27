import type { MobileMetrics } from '../../ui/mobileMetrics'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import type { MobileColors } from '../../ui/theme/mobilePalette'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Check, Copy, FolderOpen } from 'phosphor-react-native'
import { Text } from '../ui/text'
import { mobileText } from '../../i18n/mobileText'
import { MobileButton } from '../../ui/MobileButton'
import { copyDiagnosticsToClipboard } from '../../diagnostics/mobileDiagnostics'

export function MobileWorkspaceLoadFailure({ onManage, onRetry, reason }: {
  onManage: () => void; onRetry?: () => void; reason?: 'catalog' | 'selection'
}) {
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  const [copied, setCopied] = useState(false)

  const handleCopyDiagnostics = async () => {
    const result = await copyDiagnosticsToClipboard()
    if (result.success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <View style={styles.root} testID="workspace-load-failure">
      <Text accessibilityRole="alert" style={styles.message}>
        {mobileText(reason === 'catalog' ? 'mobile.vaults.catalogFailed' : 'mobile.vaults.requestFailed')}
      </Text>
      {onRetry && <MobileButton label={mobileText('pulse.retry')} onPress={onRetry} testID="vault-recovery-retry" />}
      <MobileButton
        label={mobileText('status.vault.manageWorkspaces')}
        onPress={onManage}
        icon={<FolderOpen size={16} color={mobileColors.text} />}
      />
      <MobileButton
        label={copied ? 'Fehlerbericht kopiert!' : 'Fehlerbericht kopieren'}
        onPress={handleCopyDiagnostics}
        icon={copied ? <Check size={16} color={mobileColors.green} /> : <Copy size={16} color={mobileColors.text} />}
      />
    </View>
  )
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const styles = StyleSheet.create({
    message: { color: mobileColors.textMuted, fontSize: metrics.size(14), lineHeight: metrics.size(20), maxWidth: 440, textAlign: 'center' },
    root: { alignItems: 'center', backgroundColor: mobileColors.app, flex: 1, gap: metrics.size(16), justifyContent: 'center', padding: metrics.size(24) },
  })
  return { mobileColors, styles }
}
