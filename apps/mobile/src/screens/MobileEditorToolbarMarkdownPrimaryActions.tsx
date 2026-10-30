import { Code, Star } from 'phosphor-react-native'
import { Pressable, StyleSheet } from 'react-native'
import { mobileText } from '../i18n/mobileText'
import { MobileChip } from '../ui/MobileChip'
import { MobileIconButton } from '../ui/MobileIconButton'
import { chipTone } from '../components/workspace/mobileWorkspaceTone'
import { useMobileColors, useMobileMetrics } from '../ui/theme/useMobileTheme'
import type { EditorToolbarProps } from './TabletEditorPanel.types'

export function MobileEditorToolbarMarkdownPrimaryActions({
  compact,
  note,
  onOpenChangeNoteType,
  onToggleFavorite,
  onToggleSourceMode,
  sourceModeActive,
}: Pick<
  EditorToolbarProps,
  'compact' | 'note' | 'onOpenChangeNoteType' | 'onToggleFavorite' | 'onToggleSourceMode'
> & {
  sourceModeActive: boolean
}) {
  const mobileColors = useMobileColors()
  const toolbarAction = useMobileMetrics().toolbarAction

  return (
    <>
      {onOpenChangeNoteType ? (
        <Pressable
          accessibilityLabel={note.type}
          accessibilityRole="button"
          hitSlop={6}
          style={styles.typeButton}
          testID="editor-note-type-action"
          onPress={onOpenChangeNoteType}
        >
          <MobileChip label={note.type} tone={chipTone(note.typeTone)} />
        </Pressable>
      ) : null}
      <MobileIconButton
        accessibilityLabel={mobileText(
          note.favorite ? 'command.note.removeFavorite' : 'command.note.addFavorite',
        )}
        testID="editor-favorite-action"
        onPress={onToggleFavorite}
      >
        <Star
          color={note.favorite ? mobileColors.primary : mobileColors.textMuted}
          size={toolbarAction.iconSize}
          weight={note.favorite ? 'fill' : 'regular'}
        />
      </MobileIconButton>
      {!compact ? (
        <MobileIconButton
          accessibilityLabel={mobileText(
            sourceModeActive ? 'editor.toolbar.rawReturn' : 'editor.toolbar.rawOpen',
          )}
          selected={sourceModeActive}
          testID="editor-source-action"
          onPress={onToggleSourceMode}
        >
          <Code
            color={sourceModeActive ? mobileColors.primary : mobileColors.textMuted}
            size={toolbarAction.iconSize}
          />
        </MobileIconButton>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  typeButton: {
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
