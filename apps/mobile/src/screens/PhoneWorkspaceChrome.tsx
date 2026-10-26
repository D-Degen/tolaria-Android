import { ArrowLeft, CaretLeft, List } from 'phosphor-react-native'
import { Platform, View } from 'react-native'
import { Text } from '../components/ui/text'
import { mobileText } from '../i18n/mobileText'
import { MobileIconButton } from '../ui/MobileIconButton'
import { createThemeStyles } from './phoneWorkspaceStyles'
import { useMobileStyles } from '../ui/theme/useMobileTheme'

export function PhoneTopBar({
  onBack,
  title,
}: {
  onBack: () => void
  title: string
}) {
  const { styles } = useMobileStyles(createThemeStyles)
  return (
    <View style={styles.topBar} testID="phone-top-bar">
      <PhoneBackButton onBack={onBack} />
      <Text numberOfLines={1} style={styles.topBarTitle}>{title}</Text>
    </View>
  )
}

export function PhoneBackButton({ onBack }: { onBack: () => void }) {
  const { mobileColors } = useMobileStyles(createThemeStyles)
  const BackIcon = Platform.OS === 'android' ? ArrowLeft : CaretLeft
  return (
    <MobileIconButton
      accessibilityLabel={mobileText('command.navigation.goBack')}
      testID="phone-back-action"
      onPress={onBack}
    >
      <BackIcon color={mobileColors.textMuted} size={18} />
    </MobileIconButton>
  )
}

export function PhoneSidebarButton({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { mobileColors } = useMobileStyles(createThemeStyles)
  return (
    <MobileIconButton
      accessibilityLabel={mobileText('sidebar.action.expand')}
      testID="phone-sidebar-action"
      onPress={onOpenSidebar}
    >
      <List color={mobileColors.textMuted} size={18} />
    </MobileIconButton>
  )
}
