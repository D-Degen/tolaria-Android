import { NotePencil } from 'phosphor-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../components/ui/text'
import { useMobileStyles } from '../ui/theme/useMobileTheme'
import type { MobileColors } from '../ui/theme/mobilePalette'
import type { MobileMetrics } from '../ui/mobileMetrics'
import { useMobileSettings } from './useMobileSettings'
import { SettingsCard } from './SettingsCard'

export function MobileEditorSettings() {
  const preferences = useMobileSettings()
  const styles = useMobileStyles(createStyles)
  const disabled = !preferences.ready || preferences.saving

  const currentFontSize = preferences.settings.editorFontSize ?? 'normal'
  const currentMode = preferences.settings.defaultEditingMode ?? 'wysiwyg'

  const fontSizes = [
    { key: 'compact', label: 'Kompakt', sizeHint: '14 px' },
    { key: 'normal', label: 'Standard', sizeHint: '16 px' },
    { key: 'large', label: 'Groß', sizeHint: '18 px' },
  ] as const

  const editingModes = [
    { key: 'wysiwyg', label: 'Rich-Text (Wysiwyg)', subtext: 'Formatierte Darstellung' },
    { key: 'source', label: 'Quelltext (Markdown)', subtext: 'Reiner Markdown-Text' },
  ] as const

  return (
    <SettingsCard
      badgeBg="rgba(99, 102, 241, 0.15)"
      description="Schriftgröße und Standard-Ansicht für das Schreiben anpassen"
      icon={<NotePencil color="#6366F1" size={18} weight="bold" />}
      testID="settings-editor-section"
      title="Editor & Notizen"
    >
      <View style={styles.optionGroup}>
        <Text style={styles.label}>Textgröße im Editor</Text>
        <View accessibilityRole="radiogroup" style={styles.pillRow}>
          {fontSizes.map(({ key, label, sizeHint }) => {
            const active = currentFontSize === key
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                disabled={disabled}
                style={[styles.pill, active && styles.pillActive]}
                testID={`settings-font-size-${key}`}
                onPress={() => {
                  void preferences.update({ editorFontSize: key })
                }}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
                <Text style={[styles.pillSubtext, active && styles.pillSubtextActive]}>{sizeHint}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.optionGroup}>
        <Text style={styles.label}>Standard-Ansicht beim Öffnen</Text>
        <View accessibilityRole="radiogroup" style={styles.modeColumn}>
          {editingModes.map(({ key, label, subtext }) => {
            const active = currentMode === key
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                disabled={disabled}
                style={[styles.modeRow, active && styles.modeRowActive]}
                testID={`settings-default-mode-${key}`}
                onPress={() => {
                  void preferences.update({ defaultEditingMode: key })
                }}
              >
                <View style={styles.modeRadio}>
                  {active ? <View style={styles.modeRadioInner} /> : null}
                </View>
                <View style={styles.modeTextCol}>
                  <Text style={[styles.modeTitle, active && styles.modeTitleActive]}>{label}</Text>
                  <Text style={styles.modeSubtext}>{subtext}</Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>
    </SettingsCard>
  )
}

function createStyles(colors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    optionGroup: {
      gap: metrics.size(8),
    },
    label: {
      fontSize: metrics.size(13),
      fontWeight: '600',
      color: colors.text,
    },
    pillRow: {
      flexDirection: 'row',
      gap: metrics.size(8),
    },
    pill: {
      flex: 1,
      minHeight: 44,
      paddingVertical: metrics.size(6),
      paddingHorizontal: metrics.size(8),
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.graySoft,
      alignItems: 'center',
      justifyContent: 'center',
      gap: metrics.size(2),
    },
    pillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    pillText: {
      fontSize: metrics.size(13),
      fontWeight: '500',
      color: colors.text,
    },
    pillTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    pillSubtext: {
      fontSize: metrics.size(10),
      color: colors.textMuted,
    },
    pillSubtextActive: {
      color: colors.primary,
    },
    modeColumn: {
      gap: metrics.size(8),
    },
    modeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: metrics.size(12),
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.graySoft,
      gap: metrics.size(12),
      minHeight: 48,
    },
    modeRowActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    modeRadio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeRadioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    modeTextCol: {
      flex: 1,
      gap: metrics.size(2),
    },
    modeTitle: {
      fontSize: metrics.size(13),
      fontWeight: '500',
      color: colors.text,
    },
    modeTitleActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    modeSubtext: {
      fontSize: metrics.size(11),
      color: colors.textMuted,
    },
  })
}
