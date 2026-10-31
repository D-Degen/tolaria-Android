import { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Text } from '../components/ui/text'
import { Switch } from '../components/ui/switch'
import { useMobileColors, useMobileStyles } from '../ui/theme/useMobileTheme'
import type { MobileColors } from '../ui/theme/mobilePalette'
import type { MobileMetrics } from '../ui/mobileMetrics'
import { useMobileSettings } from './useMobileSettings'

export function MobileTaskNotificationSettings() {
  const preferences = useMobileSettings()
  const colors = useMobileColors()
  const styles = useMobileStyles(createStyles)
  const enabled = preferences.settings.taskNotificationsEnabled
  const currentTime = preferences.settings.taskNotificationTime || '09:00'

  const [timeInput, setTimeInput] = useState(currentTime)
  const [invalid, setInvalid] = useState(false)

  const quickTimes = ['08:00', '09:00', '10:00', '12:00', '18:00']

  const handleTimeChange = (val: string) => {
    setTimeInput(val)
    const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(val.trim())
    if (valid) {
      setInvalid(false)
      void preferences.update({ taskNotificationTime: val.trim() })
    } else {
      setInvalid(true)
    }
  }

  const handlePickQuickTime = (time: string) => {
    setTimeInput(time)
    setInvalid(false)
    void preferences.update({ taskNotificationTime: time })
  }

  return (
    <View style={styles.section} testID="settings-task-notifications-section">
      <Text style={styles.heading}>Aufgaben-Erinnerungen</Text>

      <View style={styles.row}>
        <View style={styles.label}>
          <Text style={styles.title}>Benachrichtigungen aktivieren</Text>
          <Text style={styles.detail}>
            Erhalte Erinnerungen für fällige Aufgaben am Fälligkeitstag.
          </Text>
        </View>
        <Switch
          checked={enabled}
          disabled={!preferences.ready || preferences.saving}
          accessibilityLabel="Benachrichtigungen aktivieren"
          testID="settings-task-notifications-switch"
          onCheckedChange={(val) => {
            void preferences.update({ taskNotificationsEnabled: val })
          }}
        />
      </View>

      {enabled ? (
        <View style={styles.timeContainer}>
          <View style={styles.label}>
            <Text style={styles.title}>Standard-Uhrzeit</Text>
            <Text style={styles.detail}>
              Wann die Benachrichtigung gesendet wird, falls in der Aufgabe keine Uhrzeit definiert ist (z. B. 09:00).
            </Text>
          </View>

          <View style={styles.quickChipsRow}>
            {quickTimes.map((time) => (
              <Pressable
                accessibilityRole="button"
                key={time}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: currentTime === time ? colors.primarySoft : colors.graySoft,
                    borderColor: currentTime === time ? colors.primary : colors.border,
                  },
                ]}
                testID={`settings-time-chip-${time}`}
                onPress={() => handlePickQuickTime(time)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    { color: currentTime === time ? colors.primary : colors.text },
                  ]}
                >
                  {time}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.customTimeRow}>
            <Text style={[styles.customLabel, { color: colors.textMuted }]}>Eigene Uhrzeit (HH:MM):</Text>
            <TextInput
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              placeholder="09:00"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.timeInput,
                {
                  borderColor: invalid ? colors.danger : colors.border,
                  color: colors.text,
                },
              ]}
              testID="settings-custom-time-input"
              value={timeInput}
              onChangeText={handleTimeChange}
            />
          </View>
          {invalid ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              Bitte gültige Uhrzeit im Format HH:MM angeben (00:00 bis 23:59).
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function createStyles(colors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    customLabel: {
      fontSize: metrics.size(13),
    },
    customTimeRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: metrics.size(10),
      marginTop: metrics.size(8),
    },
    detail: {
      color: colors.textMuted,
      fontSize: metrics.size(12),
      lineHeight: metrics.size(16),
    },
    errorText: {
      fontSize: metrics.size(11),
      marginTop: metrics.size(4),
    },
    heading: {
      color: colors.text,
      fontSize: metrics.size(16),
      fontWeight: '600',
    },
    label: {
      flex: 1,
      gap: metrics.size(4),
    },
    quickChip: {
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    quickChipText: {
      fontSize: metrics.size(12),
      fontWeight: '500',
    },
    quickChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: metrics.size(8),
      marginTop: metrics.size(6),
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: metrics.size(16),
      minHeight: 44,
    },
    section: {
      gap: metrics.size(12),
      paddingTop: metrics.size(12),
    },
    timeContainer: {
      gap: metrics.size(8),
      paddingLeft: metrics.size(4),
    },
    timeInput: {
      borderRadius: 6,
      borderWidth: 1,
      fontSize: metrics.size(14),
      height: 36,
      paddingHorizontal: 8,
      width: 70,
    },
    title: {
      color: colors.text,
      fontSize: metrics.size(14),
      fontWeight: '500',
    },
  })
}
