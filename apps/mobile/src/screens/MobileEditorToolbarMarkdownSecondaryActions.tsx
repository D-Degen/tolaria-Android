import { DotsThree, ListBullets, Sparkle } from 'phosphor-react-native'
import { mobileText } from '../i18n/mobileText'
import { MobileIconButton } from '../ui/MobileIconButton'
import { useMobileColors, useMobileMetrics } from '../ui/theme/useMobileTheme'
import type { EditorToolbarProps } from './TabletEditorPanel.types'

export function MobileEditorToolbarMarkdownSecondaryActions({
  onOpenMoreActions,
  onOpenSmartNotes,
  onOpenTableOfContents,
}: Pick<EditorToolbarProps, 'onOpenMoreActions' | 'onOpenSmartNotes' | 'onOpenTableOfContents'>) {
  const mobileColors = useMobileColors()
  const toolbarAction = useMobileMetrics().toolbarAction
  return (
    <>
      {onOpenSmartNotes ? (
        <MobileIconButton
          accessibilityLabel={mobileText('editor.toolbar.openAi')}
          testID="editor-smart-notes-action"
          onPress={onOpenSmartNotes}
        >
          <Sparkle color={mobileColors.primary} size={toolbarAction.iconSize} weight="bold" />
        </MobileIconButton>
      ) : null}
      {onOpenTableOfContents ? (
        <MobileIconButton
          accessibilityLabel={mobileText('editor.toolbar.openTableOfContents')}
          testID="editor-table-of-contents-action"
          onPress={onOpenTableOfContents}
        >
          <ListBullets color={mobileColors.textMuted} size={toolbarAction.iconSize} />
        </MobileIconButton>
      ) : null}
      <MobileIconButton
        accessibilityLabel={mobileText('editor.toolbar.moreActions')}
        testID="editor-more-action"
        onPress={onOpenMoreActions}
      >
        <DotsThree color={mobileColors.textMuted} size={toolbarAction.iconSize} weight="bold" />
      </MobileIconButton>
    </>
  )
}
