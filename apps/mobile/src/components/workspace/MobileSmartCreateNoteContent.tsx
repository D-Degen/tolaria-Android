import {
  ArrowCounterClockwise,
  Check,
  ClipboardText,
  Globe,
  Microphone,
  Sparkle,
  Tag,
  YoutubeLogo,
} from 'phosphor-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import * as ClipboardUtil from 'expo-clipboard'
import { MobileButton } from '../../ui/MobileButton'
import { MobileTextInput } from '../../ui/MobileTextInput'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import type { MobileColors } from '../../ui/theme/mobilePalette'
import type { MobileMetrics } from '../../ui/mobileMetrics'
import type { MobileTypeDefinitions } from '../../workspace/mobileWorkspaceModel'
import {
  consumeIncomingSharedText,
  generateSmartNoteDraft,
  startNativeVoiceRecognition,
  takePendingAutoStartVoiceInput,
  takePendingSharedText,
} from '../../workspace/smartNotes/smartNotesEngine'
import type { SmartNoteDraft } from '../../workspace/smartNotes/smartNotesTypes'
import {
  detectUrlPreviewInfo,
  extractUrlsFromText,
} from '../../workspace/smartNotes/urlContentGrabber'
import { Text } from '../ui/text'

export type MobileSmartCreateNoteContentProps = {
  typeDefinitions?: MobileTypeDefinitions
  onClose: () => void
  onCreateSmartNote?: (draft: {
    title: string
    type: string
    tags: string[]
    markdownBody: string
  }) => void
  onCreateNoteFallback?: (titleOverride?: string) => void
}

function resolveAvailableTypes(typeDefinitions?: MobileTypeDefinitions): string[] {
  const keys = Object.keys(typeDefinitions ?? {}).filter((k) => k.trim().length > 0)
  const base = ['Note', 'Meeting', 'Project', 'Task', 'Idea']
  return Array.from(new Set(['Note', ...keys, ...base]))
}

export function MobileSmartCreateNoteContent(props: MobileSmartCreateNoteContentProps) {
  const { typeDefinitions, onClose, onCreateSmartNote, onCreateNoteFallback } = props
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)

  const availableTypes = useMemo(() => resolveAvailableTypes(typeDefinitions), [typeDefinitions])

  const [rawInput, setRawInput] = useState(() => takePendingSharedText() ?? '')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [draft, setDraft] = useState<SmartNoteDraft | null>(null)
  const autoVoiceTriggeredRef = useRef(false)

  const detectedUrlInfo = useMemo(() => {
    const { firstUrl } = extractUrlsFromText(rawInput)
    return firstUrl ? detectUrlPreviewInfo(firstUrl) : null
  }, [rawInput])

  const [editedTitle, setEditedTitle] = useState('')
  const [selectedType, setSelectedType] = useState('Note')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [editedBody, setEditedBody] = useState('')

  const runGenerateForInput = useCallback(
    async (inputText: string) => {
      if (!inputText.trim()) return
      setLoading(true)
      try {
        const generated = await generateSmartNoteDraft(inputText, availableTypes)
        setDraft(generated)
        setEditedTitle(generated.title)
        setSelectedType(generated.type || 'Note')
        setSelectedTags(generated.tags)
        setEditedBody(generated.markdownBody)
      } finally {
        setLoading(false)
      }
    },
    [availableTypes],
  )

  const handleStartVoiceDictation = useCallback(async () => {
    setListening(true)
    try {
      const spoken = await startNativeVoiceRecognition()
      if (spoken) {
        let combined = spoken
        setRawInput((prev) => {
          combined = prev.trim().length > 0 ? `${prev.trim()}\n${spoken}` : spoken
          return combined
        })
        await runGenerateForInput(combined)
      }
    } finally {
      setListening(false)
    }
  }, [runGenerateForInput])

  useEffect(() => {
    void consumeIncomingSharedText().then((shared) => {
      if (shared) {
        takePendingSharedText()
        setRawInput((prev) => (prev.trim().length > 0 ? prev : shared))
      }
    })
  }, [])

  useEffect(() => {
    if (autoVoiceTriggeredRef.current) return
    if (takePendingAutoStartVoiceInput()) {
      autoVoiceTriggeredRef.current = true
      void handleStartVoiceDictation()
    }
  }, [handleStartVoiceDictation])

  const handlePasteClipboard = async () => {
    try {
      const clip = await ClipboardUtil.getStringAsync()
      if (clip && clip.trim().length > 0) {
        setRawInput((prev) => (prev.trim().length > 0 ? `${prev}\n${clip.trim()}` : clip.trim()))
      }
    } catch {
      // Ignore clipboard errors
    }
  }

  const handleGenerate = async () => {
    await runGenerateForInput(rawInput)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const handleConfirmCreate = () => {
    const finalTitle = editedTitle.trim() || 'Neue Notiz'
    if (onCreateSmartNote) {
      onCreateSmartNote({
        title: finalTitle,
        type: selectedType || 'Note',
        tags: selectedTags,
        markdownBody: editedBody,
      })
    } else {
      onCreateNoteFallback?.(finalTitle)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      testID="smart-create-note-content"
    >
      {/* Gemini Nano Header Banner */}
      <View style={styles.badgeBanner}>
        <Sparkle color={mobileColors.primary} size={18} weight="fill" />
        <View style={styles.badgeTextContainer}>
          <Text style={styles.badgeTitle}>Gemini Nano • KI-Notizerstellung</Text>
          <Text style={styles.badgeSubtitle}>
            100% kostenlos & offline auf deinem Gerät – diktiere oder tippe deine Gedanken
          </Text>
        </View>
      </View>

      {/* Step 1: Raw Input */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Deine Gedanken / Spracheingabe</Text>
          <View style={styles.headerActionsRow}>
            <MobileButton
              density="compact"
              disabled={listening || loading}
              icon={<Microphone color={mobileColors.primary} size={14} weight="fill" />}
              label={listening ? 'Höre zu...' : 'Spracheingabe'}
              testID="smart-create-voice-button"
              variant="secondary"
              onPress={handleStartVoiceDictation}
            />
            <MobileButton
              density="compact"
              icon={<ClipboardText color={mobileColors.text} size={14} />}
              label="Aus Zwischenablage"
              testID="smart-create-paste-button"
              variant="secondary"
              onPress={handlePasteClipboard}
            />
          </View>
        </View>
        {listening && (
          <View style={styles.urlDetectedBanner} testID="smart-create-voice-listening-banner">
            <Microphone color={mobileColors.primary} size={16} weight="fill" />
            <Text style={styles.urlDetectedText}>
              Spracheingabe aktiv – bitte sprich jetzt deine Notiz...
            </Text>
          </View>
        )}
        <MobileTextInput
          autoCapitalize="sentences"
          autoFocus={!listening}
          label="Text, Spracheingabe oder beliebige URL (Webseite, Artikel, YouTube...)"
          multiline
          numberOfLines={4}
          placeholder="z.B. https://... Link einfügen oder Gedanken diktieren: Meeting mit Lisa zum Release..."
          style={styles.multilineInput}
          testID="smart-create-raw-input"
          value={rawInput}
          onChangeText={setRawInput}
        />
        {detectedUrlInfo && (
          <View style={styles.urlDetectedBanner} testID="smart-create-url-detected-banner">
            {detectedUrlInfo.kind === 'youtube' ? (
              <YoutubeLogo color={mobileColors.primary} size={16} weight="fill" />
            ) : (
              <Globe color={mobileColors.primary} size={16} weight="bold" />
            )}
            <Text numberOfLines={1} style={styles.urlDetectedText}>
              {detectedUrlInfo.label} erkannt – Inhalt wird beim Strukturieren automatisch geladen
            </Text>
          </View>
        )}
        <View style={styles.generateButtonRow}>
          <MobileButton
            disabled={loading || rawInput.trim().length === 0}
            icon={<Sparkle color={mobileColors.textInverse} size={16} weight="fill" />}
            label={
              draft
                ? 'Neu generieren'
                : detectedUrlInfo
                  ? 'Link abrufen & mit KI analysieren'
                  : 'Mit Gemini strukturieren'
            }
            testID="smart-create-generate-button"
            variant="primary"
            onPress={handleGenerate}
          />
        </View>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={mobileColors.primary} size="small" />
          <Text style={styles.loadingText}>
            {detectedUrlInfo
              ? `Lade ${detectedUrlInfo.domain} & analysiere Inhalt mit lokaler KI...`
              : 'Gemini strukturiert Titel, Typ, Tags & Inhalt...'}
          </Text>
        </View>
      )}

      {/* Step 2: Editable Preview */}
      {!loading && draft && (
        <View style={styles.previewCard} testID="smart-create-preview-card">
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Vorschau & Anpassung</Text>
            <Text style={styles.engineBadge}>
              {draft.engine === 'gemini-nano' ? 'Gemini Nano' : 'On-Device NLP'}
            </Text>
          </View>

          {/* Editable Title */}
          <MobileTextInput
            autoCapitalize="sentences"
            label="Vorgeschlagener Titel"
            placeholder="Notiztitel"
            testID="smart-create-title-input"
            value={editedTitle}
            onChangeText={setEditedTitle}
          />

          {/* Selectable Note Type */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Vorgeschlagener Notiz-Typ</Text>
            <View style={styles.chipRow}>
              {availableTypes.map((typeOption) => {
                const active = selectedType === typeOption
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    key={typeOption}
                    style={[styles.chip, active ? styles.chipActive : null]}
                    testID={`smart-create-type-${typeOption}`}
                    onPress={() => setSelectedType(typeOption)}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                      {typeOption}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* Toggleable Tags */}
          {draft.tags.length > 0 && (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Tags (Antippen zum An-/Abwählen)</Text>
              <View style={styles.chipRow}>
                {draft.tags.map((tag) => {
                  const active = selectedTags.includes(tag)
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      key={tag}
                      style={[styles.chip, active ? styles.chipActive : null]}
                      testID={`smart-create-tag-${tag}`}
                      onPress={() => toggleTag(tag)}
                    >
                      <Tag
                        color={active ? mobileColors.primary : mobileColors.textMuted}
                        size={12}
                        weight={active ? 'fill' : 'regular'}
                      />
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                        #{tag}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          )}

          {/* Editable Markdown Content & To-Dos */}
          <MobileTextInput
            autoCapitalize="sentences"
            label="Strukturierter Markdown-Inhalt & To-Dos"
            multiline
            numberOfLines={6}
            placeholder="Markdown-Inhalt..."
            style={styles.multilinePreviewInput}
            testID="smart-create-body-input"
            value={editedBody}
            onChangeText={setEditedBody}
          />

          {/* Action Footer */}
          <View style={styles.previewActions}>
            <MobileButton
              icon={<ArrowCounterClockwise color={mobileColors.text} size={16} />}
              label="Neu generieren"
              testID="smart-create-regenerate-button"
              variant="secondary"
              onPress={handleGenerate}
            />
            <MobileButton
              icon={<Check color={mobileColors.textInverse} size={16} weight="bold" />}
              label="Notiz erstellen"
              testID="smart-create-confirm-button"
              variant="primary"
              onPress={handleConfirmCreate}
            />
          </View>
        </View>
      )}

      <View style={styles.footerSpacing}>
        <MobileButton label="Abbrechen" variant="ghost" onPress={onClose} />
      </View>
    </ScrollView>
  )
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, type: mobileType } = metrics
  const styles = StyleSheet.create({
    badgeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: mobileSpace.md,
      backgroundColor: mobileColors.graySoft,
      borderRadius: metrics.size(8),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: mobileColors.border,
      gap: mobileSpace.sm,
    },
    badgeSubtitle: {
      color: mobileColors.textMuted,
      fontSize: mobileType.caption,
      marginTop: 2,
    },
    badgeTextContainer: {
      flex: 1,
    },
    badgeTitle: {
      color: mobileColors.text,
      fontSize: mobileType.body,
      fontWeight: '600',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: mobileSpace.sm,
      paddingVertical: metrics.size(5),
      borderRadius: metrics.size(14),
      backgroundColor: mobileColors.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: mobileColors.border,
    },
    chipActive: {
      borderColor: mobileColors.primary,
      backgroundColor: mobileColors.graySoft,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: mobileSpace.xs,
    },
    chipText: {
      color: mobileColors.textMuted,
      fontSize: mobileType.caption,
      fontWeight: '500',
    },
    chipTextActive: {
      color: mobileColors.primary,
      fontWeight: '600',
    },
    container: {
      padding: mobileSpace.lg,
      gap: mobileSpace.md,
    },
    engineBadge: {
      color: mobileColors.primary,
      fontSize: mobileType.micro,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    fieldBlock: {
      gap: mobileSpace.xs,
    },
    fieldLabel: {
      color: mobileColors.textMuted,
      fontSize: mobileType.caption,
    },
    footerSpacing: {
      marginTop: mobileSpace.xs,
      alignItems: 'center',
    },
    generateButtonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: mobileSpace.xs,
    },
    headerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: mobileSpace.xs,
    },
    loadingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: mobileSpace.md,
      gap: mobileSpace.sm,
    },
    loadingText: {
      color: mobileColors.textMuted,
      fontSize: mobileType.body,
    },
    multilineInput: {
      minHeight: metrics.size(88),
      textAlignVertical: 'top',
    },
    multilinePreviewInput: {
      minHeight: metrics.size(120),
      textAlignVertical: 'top',
    },
    previewActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: mobileSpace.sm,
      marginTop: mobileSpace.xs,
    },
    previewCard: {
      padding: mobileSpace.md,
      borderRadius: metrics.size(10),
      backgroundColor: mobileColors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: mobileColors.primary,
      gap: mobileSpace.md,
    },
    sectionCard: {
      padding: mobileSpace.md,
      borderRadius: metrics.size(10),
      backgroundColor: mobileColors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: mobileColors.border,
      gap: mobileSpace.sm,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: mobileSpace.sm,
    },
    sectionTitle: {
      color: mobileColors.text,
      fontSize: mobileType.body,
      fontWeight: '600',
    },
    urlDetectedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: mobileSpace.xs,
      paddingHorizontal: mobileSpace.sm,
      paddingVertical: metrics.size(6),
      borderRadius: metrics.size(6),
      backgroundColor: mobileColors.graySoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: mobileColors.primary,
    },
    urlDetectedText: {
      flex: 1,
      color: mobileColors.primary,
      fontSize: mobileType.caption,
      fontWeight: '500',
    },
  })
  return { styles, mobileColors }
}
