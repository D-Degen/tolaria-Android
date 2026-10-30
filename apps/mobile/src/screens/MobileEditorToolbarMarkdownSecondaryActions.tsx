import { DotsThree } from 'phosphor-react-native'
import { mobileText } from '../i18n/mobileText'
import { MobileIconButton } from '../ui/MobileIconButton'
import { useMobileColors, useMobileMetrics } from '../ui/theme/useMobileTheme'
import type { EditorToolbarProps } from './TabletEditorPanel.types'

export function MobileEditorToolbarMarkdownSecondaryActions({
  onOpenMoreActions,
}: Pick<EditorToolbarProps, 'onOpenMoreActions' | 'onOpenSmartNotes' | 'onOpenTableOfContents'>) {
  const mobileColors = useMobileColors()
  const toolbarAction = useMobileMetrics().toolbarAction
  return (
    <MobileIconButton
      accessibilityLabel={mobileText('editor.toolbar.moreActions')}
      testID="editor-more-action"
      onPress={onOpenMoreActions}
    >
      <DotsThree color={mobileColors.textMuted} size={toolbarAction.iconSize} weight="bold" />
    </MobileIconButton>
  )
}
