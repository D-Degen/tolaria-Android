import { useBridgeState, type EditorBridge } from '@10play/tentap-editor'
import type { ComponentProps } from 'react'
import { StyleSheet, View } from 'react-native'
import { useMobileDeviceLayout } from '../../ui/useMobileDeviceLayout'
import { MobileCompactFormattingToolbar } from './MobileCompactFormattingToolbar'
import { MobileMarkdownFormattingToolbar } from './MobileMarkdownFormattingToolbar'
import { formattingToolbarSelection } from './mobileFormattingToolbarModel'
import { MobileTaskDueToolbarAffordance } from './MobileTaskDueToolbarAffordance'

type Props = Omit<ComponentProps<typeof MobileCompactFormattingToolbar>, 'selected' | 'inTable' | 'onDismissKeyboard'> & { editor: EditorBridge }

export function MobileWysiwygFormattingToolbar({ editor, ...props }: Props) {
  const phone = useMobileDeviceLayout() === 'phone'
  const state = useBridgeState(editor)
  const isTaskList = Boolean(state.isTaskListActive)
  const tableState = state as typeof state & { canAddRowAfter?: boolean }
  const Toolbar = phone ? MobileCompactFormattingToolbar : MobileMarkdownFormattingToolbar
  return (
    <View style={styles.container}>
      {isTaskList ? <MobileTaskDueToolbarAffordance editor={editor} /> : null}
      <Toolbar
        {...props}
        selected={formattingToolbarSelection(state)}
        inTable={tableState.canAddRowAfter === true}
        onDismissKeyboard={() => editor.blur()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
})
