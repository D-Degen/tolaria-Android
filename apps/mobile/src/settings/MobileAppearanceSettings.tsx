import { DeviceMobile, Moon, Palette, Sun } from 'phosphor-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../components/ui/text'
import { mobileText } from '../i18n/mobileText'
import { useMobileColors, useMobileStyles } from '../ui/theme/useMobileTheme'
import type { MobileColors } from '../ui/theme/mobilePalette'
import type { MobileMetrics } from '../ui/mobileMetrics'
import { useMobileSettings } from './useMobileSettings'
import { useMobileAnalytics } from '../analytics/useMobileAnalytics'
import { SettingsCard } from './SettingsCard'

export function MobileAppearanceSettings() {
  const preferences = useMobileSettings()
  const analytics = useMobileAnalytics()
  const mobileColors = useMobileColors()
  const styles = useMobileStyles(createStyles)
  const disabled = !preferences.ready || preferences.saving

  const themes = [
    {
      key: 'light' as const,
      icon: <Sun size={15} color={preferences.settings.theme === 'light' ? mobileColors.primary : mobileColors.textMuted} weight="bold" />,
    },
    {
      key: 'dark' as const,
      icon: <Moon size={15} color={preferences.settings.theme === 'dark' ? mobileColors.primary : mobileColors.textMuted} weight="bold" />,
    },
    {
      key: 'system' as const,
      icon: <DeviceMobile size={15} color={preferences.settings.theme === 'system' ? mobileColors.primary : mobileColors.textMuted} weight="bold" />,
    },
  ]

  return (
    <SettingsCard
      badgeBg="rgba(168, 85, 247, 0.15)"
      description={mobileText('settings.appearance.description')}
      icon={<Palette color="#A855F7" size={18} weight="bold" />}
      testID="settings-appearance-section"
      title={mobileText('settings.appearance.title')}
    >
      <View
        accessibilityLabel={mobileText('settings.theme.label')}
        accessibilityRole="radiogroup"
        style={styles.previewGrid}
      >
        {themes.map(({ key, icon }) => {
          const selected = preferences.settings.theme === key
          return (
            <Pressable
              key={key}
              accessibilityLabel={mobileText(`settings.theme.${key}`)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              disabled={disabled}
              style={[
                styles.previewCard,
                selected && styles.previewCardSelected,
              ]}
              testID={`settings-theme-${key}`}
              onPress={() => {
                void preferences.update({ theme: key }).then(saved => {
                  if (saved) analytics.capture({ name: 'theme_mode_changed', mode: key })
                })
              }}
            >
              {/* Miniature UI illustration */}
              <View style={[styles.miniApp, selected && styles.miniAppSelected]}>
                {key === 'light' && (
                  <View style={styles.miniLight}>
                    <View style={styles.miniBarLight} />
                    <View style={styles.miniLineLight1} />
                    <View style={styles.miniLineLight2} />
                  </View>
                )}
                {key === 'dark' && (
                  <View style={styles.miniDark}>
                    <View style={styles.miniBarDark} />
                    <View style={styles.miniLineDark1} />
                    <View style={styles.miniLineDark2} />
                  </View>
                )}
                {key === 'system' && (
                  <View style={styles.miniSystemSplit}>
                    <View style={styles.miniSystemHalfLight}>
                      <View style={styles.miniBarLight} />
                      <View style={styles.miniLineLight1} />
                    </View>
                    <View style={styles.miniSystemHalfDark}>
                      <View style={styles.miniBarDark} />
                      <View style={styles.miniLineDark1} />
                    </View>
                  </View>
                )}
              </View>

              {/* Title & Icon */}
              <View style={styles.labelRow}>
                {icon}
                <Text style={[styles.labelText, selected && styles.labelTextSelected]}>
                  {mobileText(`settings.theme.${key}`)}
                </Text>
              </View>

              {/* Selection Dot */}
              <View style={[styles.radioDot, selected && styles.radioDotSelected]}>
                {selected ? <View style={styles.radioDotInner} /> : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </SettingsCard>
  )
}

function createStyles(colors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    previewGrid: {
      flexDirection: 'row',
      gap: metrics.size(10),
    },
    previewCard: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.graySoft,
      padding: metrics.size(8),
      alignItems: 'center',
      gap: metrics.size(8),
    },
    previewCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    miniApp: {
      width: '100%',
      height: 54,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    miniAppSelected: {
      borderColor: colors.primary,
    },
    miniLight: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      padding: 5,
      gap: 4,
    },
    miniBarLight: {
      height: 6,
      borderRadius: 3,
      backgroundColor: '#E2E8F0',
      width: '45%',
    },
    miniLineLight1: {
      height: 4,
      borderRadius: 2,
      backgroundColor: '#CBD5E1',
      width: '80%',
    },
    miniLineLight2: {
      height: 4,
      borderRadius: 2,
      backgroundColor: '#E2E8F0',
      width: '60%',
    },
    miniDark: {
      flex: 1,
      backgroundColor: '#0F172A',
      padding: 5,
      gap: 4,
    },
    miniBarDark: {
      height: 6,
      borderRadius: 3,
      backgroundColor: '#334155',
      width: '45%',
    },
    miniLineDark1: {
      height: 4,
      borderRadius: 2,
      backgroundColor: '#475569',
      width: '80%',
    },
    miniLineDark2: {
      height: 4,
      borderRadius: 2,
      backgroundColor: '#334155',
      width: '60%',
    },
    miniSystemSplit: {
      flex: 1,
      flexDirection: 'row',
    },
    miniSystemHalfLight: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      padding: 5,
      gap: 4,
    },
    miniSystemHalfDark: {
      flex: 1,
      backgroundColor: '#0F172A',
      padding: 5,
      gap: 4,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    labelText: {
      fontSize: metrics.size(12),
      fontWeight: '500',
      color: colors.text,
    },
    labelTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    radioDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioDotSelected: {
      borderColor: colors.primary,
    },
    radioDotInner: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.primary,
    },
  })
}
