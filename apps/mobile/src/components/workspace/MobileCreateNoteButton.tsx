import { Plus, Sparkle } from 'phosphor-react-native'
import { Platform, StyleSheet, Vibration } from 'react-native'
import { mobileCopy } from '../../i18n/mobileText'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import { requestAutoStartVoiceInput } from '../../workspace/smartNotes/smartNotesEngine'
import { Button } from '../ui/button'
import { createActionStyles } from './MobileNoteListPanel.styles'
import { mobileNoteListCreateChrome } from './MobileNoteListPanelChrome'

export function MobileCreateNoteButton({
  onLongPress,
  onPress,
  onSmartVoicePress,
  visible,
}: {
  onLongPress?: () => void
  onPress: () => void
  onSmartVoicePress?: () => void
  visible: boolean
}) {
  const { styles, mobileColors, createIconSize, smartVoiceIconSize } =
    useMobileStyles(createActionStyles)
  if (!visible) return null

  const triggerHaptic = () => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        Vibration.vibrate(25)
      } catch {
        // Ignore vibration permission or device support errors
      }
    }
  }

  const handleLongPress = () => {
    if (!onLongPress) return
    triggerHaptic()
    onLongPress()
  }

  const handleSmartVoicePress = () => {
    const targetAction = onSmartVoicePress ?? onLongPress
    if (!targetAction) return
    triggerHaptic()
    requestAutoStartVoiceInput()
    targetAction()
  }

  const showSmartVoiceButton = Boolean(onSmartVoicePress ?? onLongPress)

  return (
    <>
      {showSmartVoiceButton ? (
        <Button
          accessibilityLabel="KI-Sprachnotiz erstellen"
          android_ripple={{ color: 'rgba(99, 102, 241, 0.2)', borderless: false }}
          className="shadow-md active:opacity-90"
          style={StyleSheet.flatten(styles.smartVoiceAction)}
          testID={mobileNoteListCreateChrome.smartVoiceTestID}
          onPress={handleSmartVoicePress}
        >
          <Sparkle color={mobileColors.primary} size={smartVoiceIconSize} weight="fill" />
        </Button>
      ) : null}
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
    </>
  )
}
