import { PaperPlaneRight, Trash } from 'phosphor-react-native'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Vibration,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '../ui/text'
import type { MobileMetrics } from '../../ui/mobileMetrics'
import type { MobileColors } from '../../ui/theme/mobilePalette'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import {
  cancelVoiceRecordingSession,
  generateSmartNoteDraft,
  startVoiceRecordingSession,
  stopVoiceRecordingSession,
  subscribeVoiceRecordingPartial,
  subscribeVoiceRecordingRms,
} from '../../workspace/smartNotes/smartNotesEngine'

export type MobileVoiceRecordingBarProps = {
  visible: boolean
  onClose: () => void
  availableTypes?: string[]
  onCreateSmartNote?: (draft: {
    title: string
    type: string
    tags: string[]
    markdownBody: string
  }) => void
}

const BAR_MULTIPLIERS = [0.6, 1.2, 0.8, 1.5, 2.0, 1.7, 2.2, 1.4, 1.8, 1.1, 0.7, 0.5]

export function MobileVoiceRecordingBar(props: MobileVoiceRecordingBarProps) {
  if (!props.visible) return null
  return <MobileVoiceRecordingBarInner {...props} />
}

function MobileVoiceRecordingBarInner({
  availableTypes = ['Note'],
  onClose,
  onCreateSmartNote,
}: MobileVoiceRecordingBarProps) {
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  const insets = useSafeAreaInsets()

  const [durationSec, setDurationSec] = useState(0)
  const [rmsLevel, setRmsLevel] = useState(0)
  const [partialText, setPartialText] = useState('')
  const [status, setStatus] = useState<'recording' | 'processing' | 'error'>('recording')
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [pulseAnim] = useState(() => new Animated.Value(1))

  const triggerHaptic = (duration = 25) => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        Vibration.vibrate(duration)
      } catch {
        // Ignore haptics error
      }
    }
  }

  // Pulsing red dot animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 650, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulseAnim])

  // Lifecycle while bar is mounted
  useEffect(() => {
    let isMounted = true

    // Start native continuous speech recognizer
    void startVoiceRecordingSession().then((started) => {
      if (!isMounted) return
      if (!started) {
        setStatus('error')
        setFeedbackMessage('Mikrofon nicht verfügbar')
        setTimeout(() => {
          if (isMounted) onClose()
        }, 1600)
      }
    })

    const timer = setInterval(() => {
      setDurationSec((prev) => prev + 1)
    }, 1000)

    const unsubscribeRms = subscribeVoiceRecordingRms((rms) => {
      if (isMounted) {
        setRmsLevel(rms)
      }
    })

    const unsubscribePartial = subscribeVoiceRecordingPartial((text) => {
      if (isMounted) {
        setPartialText(text)
      }
    })

    return () => {
      isMounted = false
      clearInterval(timer)
      unsubscribeRms()
      unsubscribePartial()
    }
  }, [onClose])

  const handleCancel = useCallback(async () => {
    triggerHaptic(20)
    await cancelVoiceRecordingSession()
    onClose()
  }, [onClose])

  const handleSend = useCallback(async () => {
    triggerHaptic(35)
    setStatus('processing')
    setFeedbackMessage('KI formatiert Notiz...')

    try {
      const spoken = await stopVoiceRecordingSession()
      const finalText = spoken?.trim() || partialText.trim()

      if (!finalText) {
        setFeedbackMessage('Keine Sprache erkannt')
        setTimeout(() => {
          onClose()
        }, 1200)
        return
      }

      const draft = await generateSmartNoteDraft(finalText, availableTypes)
      onCreateSmartNote?.(draft)
      onClose()
    } catch {
      setFeedbackMessage('Fehler bei der Verarbeitung')
      setTimeout(() => {
        onClose()
      }, 1400)
    }
  }, [availableTypes, onCreateSmartNote, onClose, partialText])

  const minutes = Math.floor(durationSec / 60)
  const seconds = durationSec % 60
  const timerFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const bottomInset = Math.max(insets.bottom, 12)

  return (
    <View
      style={[styles.container, { bottom: bottomInset }]}
      testID="mobile-voice-recording-bar"
    >
      {status === 'processing' ? (
        <View style={styles.processingRow}>
          <ActivityIndicator color={mobileColors.primary} size="small" />
          <Text style={styles.processingText}>{feedbackMessage || 'KI formatiert Notiz...'}</Text>
        </View>
      ) : status === 'error' ? (
        <View style={styles.processingRow}>
          <Text style={styles.errorText}>{feedbackMessage || 'Aufnahme fehlgeschlagen'}</Text>
        </View>
      ) : (
        <View style={styles.recordingRow}>
          {/* Left: Pulsing Red Dot & Timer */}
          <View style={styles.leftGroup}>
            <Animated.View style={[styles.redDot, { opacity: pulseAnim }]} />
            <Text style={styles.timerText} testID="voice-record-timer">
              {timerFormatted}
            </Text>
          </View>

          {/* Center: Dynamic Waveform Bars */}
          <View style={styles.waveformContainer} testID="voice-record-waveform">
            {BAR_MULTIPLIERS.map((multiplier, index) => {
              const clamped = Math.max(0, rmsLevel + 2)
              const barHeight = Math.min(26, Math.max(4, 4 + clamped * 1.5 * multiplier))
              return (
                <View
                  key={`wave-bar-${index}`}
                  style={[
                    styles.waveformBar,
                    {
                      height: barHeight,
                      backgroundColor:
                        index % 2 === 0 ? mobileColors.primary : mobileColors.purple,
                    },
                  ]}
                />
              )
            })}
          </View>

          {/* Right: Trash / Cancel & Send / Finish */}
          <View style={styles.rightGroup}>
            <Pressable
              accessibilityLabel="Aufnahme verwerfen"
              accessibilityRole="button"
              hitSlop={8}
              style={styles.cancelButton}
              testID="voice-record-cancel"
              onPress={handleCancel}
            >
              <Trash color={mobileColors.danger} size={18} />
            </Pressable>
            <Pressable
              accessibilityLabel="Notiz erstellen"
              accessibilityRole="button"
              hitSlop={8}
              style={styles.sendButton}
              testID="voice-record-send"
              onPress={handleSend}
            >
              <PaperPlaneRight color={mobileColors.textInverse} size={17} weight="fill" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Subtle transcription preview row if user has spoken something */}
      {status === 'recording' && partialText ? (
        <View style={styles.previewRow}>
          <Text numberOfLines={1} style={styles.previewText}>
            {partialText}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space } = metrics
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: space.md,
      right: space.md,
      backgroundColor: mobileColors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: mobileColors.border,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 10,
      zIndex: 60,
    },
    recordingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 44,
    },
    leftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      minWidth: 72,
    },
    redDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#ef4444',
    },
    timerText: {
      fontSize: metrics.size(14),
      fontWeight: '600',
      color: mobileColors.text,
      fontVariant: ['tabular-nums'],
    },
    waveformContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingHorizontal: space.xs,
      height: 32,
    },
    waveformBar: {
      width: 3.5,
      borderRadius: 2,
    },
    rightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
    },
    cancelButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: mobileColors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    processingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 44,
      gap: space.sm,
    },
    processingText: {
      fontSize: metrics.size(13),
      fontWeight: '500',
      color: mobileColors.text,
    },
    errorText: {
      fontSize: metrics.size(13),
      fontWeight: '500',
      color: mobileColors.danger,
    },
    previewRow: {
      paddingTop: 2,
      paddingBottom: 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: mobileColors.border,
      marginTop: 2,
    },
    previewText: {
      fontSize: metrics.size(11),
      color: mobileColors.textMuted,
      fontStyle: 'italic',
    },
  })

  return { mobileColors, styles }
}
