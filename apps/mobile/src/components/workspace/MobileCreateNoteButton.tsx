import { Plus } from 'phosphor-react-native'
import { StyleSheet } from 'react-native'
import { mobileCopy } from '../../i18n/mobileText'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import { Button } from '../ui/button'
import { createActionStyles } from './MobileNoteListPanel.styles'
import { mobileNoteListCreateChrome } from './MobileNoteListPanelChrome'

export function MobileCreateNoteButton({ onPress, visible }: { onPress: () => void; visible: boolean }) {
  const { styles, mobileColors, createIconSize } = useMobileStyles(createActionStyles)
  if (!visible) return null
  return (
    <Button
      accessibilityLabel={mobileCopy.createNote}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.24)', borderless: false }}
      className="shadow-lg active:opacity-90"
      style={StyleSheet.flatten(styles.createAction)}
      testID={mobileNoteListCreateChrome.testID}
      onPress={onPress}
    >
      <Plus color={mobileColors.textInverse} size={createIconSize} weight="bold" />
    </Button>
  )
}
