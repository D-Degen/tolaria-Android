import { Plus } from 'phosphor-react-native'
import { Platform, StyleSheet, Vibration } from 'react-native'
import { mobileCopy } from '../../i18n/mobileText'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import { Button } from '../ui/button'
import { createActionStyles } from './MobileNoteListPanel.styles'
import { mobileNoteListCreateChrome } from './MobileNoteListPanelChrome'

export function MobileCreateNoteButton({
  onLongPress,
  onPress,
  visible,
}: {
  onLongPress?: () => void
  onPress: () => void
  visible: boolean
}) {
  const { styles, mobileColors, createIconSize } = useMobileStyles(createActionStyles)
  if (!visible) return null

  const handleLongPress = () => {
    if (!onLongPress) return
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        Vibration.vibrate(25)
      } catch {
        // Ignore vibration permission or device support errors
      }
    }
    onLongPress()
  }

  return (
    <Button
      accessibilityLabel={mobileCopy.createNote}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.24)', borderless: false }}
      className="shadow-lg active:opacity-90"
      delayLongPress={400}
      style={StyleSheet.flatten(styles.createAction)}
      testID={mobileNoteListCreateChrome.testID}
      onLongPress={onLongPress ? handleLongPress : undefined}
      onPress={onPress}
    >
      <Plus color={mobileColors.textInverse} size={createIconSize} weight="bold" />
    </Button>
  )
}
