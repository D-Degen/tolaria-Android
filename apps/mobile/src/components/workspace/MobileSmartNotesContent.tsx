import { Check, Clipboard, Globe, Lightbulb, ListChecks, Sparkle, Tag, TextAlignLeft } from 'phosphor-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import * as ClipboardUtil from 'expo-clipboard'
import { MobileButton } from '../../ui/MobileButton'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import type { MobileColors } from '../../ui/theme/mobilePalette'
import type { MobileMetrics } from '../../ui/mobileMetrics'
import { writeFrontmatterValue } from '../../workspace/mobileWorkspaceNoteContent'
import {
  mobileDocumentBody,
  mobileDocumentWithBody,
  mobileNoteEditableContent,
} from '../../workspace/mobileDocumentContent'
import type { MobileNote, MobilePropertyValue } from '../../workspace/mobileWorkspaceModel'
import { executeSmartNoteAction, isNoteOnlyLink } from '../../workspace/smartNotes/smartNotesEngine'
import type { SmartNoteActionType, SmartNotesResult } from '../../workspace/smartNotes/smartNotesTypes'
import { Text } from '../ui/text'

export type MobileSmartNotesContentProps = {
  note: MobileNote | null
  onClose: () => void
  onEditProperty?: (noteId: string, key: string, value: MobilePropertyValue) => void
  onUpdateContent?: (noteId: string, content: string) => void
  onUpdateNoteTitle?: (noteId: string, title: string) => void
}

function noteContentText(note: MobileNote): string {
  const editable = mobileNoteEditableContent(note)
  const body = mobileDocumentBody(editable).trim()
  if (body.length > 0) return body
  if (note.editorBullets && note.editorBullets.length > 0) {
    return note.editorBullets.join('\n')
  }
  return note.title || ''
}

function insertSummaryIntoBody(body: string, summaryBlock: string): string {
  const lines = body.split(/\r?\n/)
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0)
  if (firstContentIndex >= 0) {
    const firstLine = lines[firstContentIndex]?.trim() ?? ''
    if (firstLine === '#' || firstLine.startsWith('# ')) {
      return [
        ...lines.slice(0, firstContentIndex + 1),
        '',
        summaryBlock.trimEnd(),
        ...lines.slice(firstContentIndex + 1),
      ].join('\n')
    }
  }
  return `${summaryBlock}${body.replace(/^\s+/, '')}`
}

export function MobileSmartNotesContent(props: MobileSmartNotesContentProps) {
  const { note, onClose, onEditProperty, onUpdateContent, onUpdateNoteTitle } = props
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  const [activeAction, setActiveAction] = useState<SmartNoteActionType | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SmartNotesResult | null>(null)
  const [applied, setApplied] = useState(false)
  const autoLinkNoteIdRef = useRef<string | null>(null)

  const handleAction = useCallback(
    async (action: SmartNoteActionType) => {
      if (!note) return
      setActiveAction(action)
      setLoading(true)
      setApplied(false)
      try {
        const content = noteContentText(note)
        const res = await executeSmartNoteAction(action, content)
        setResult(res)
      } finally {
        setLoading(false)
      }
    },
    [note],
  )

  useEffect(() => {
    if (!note) return
    if (autoLinkNoteIdRef.current === note.id) return
    const content = noteContentText(note)
    if (isNoteOnlyLink(content)) {
      autoLinkNoteIdRef.current = note.id
      void handleAction('analyzeLink')
    }
  }, [handleAction, note])

  const handleApply = () => {
    if (!note || !result) return

    const rawDocument = mobileNoteEditableContent(note)
    const currentBody = mobileDocumentBody(rawDocument)

    if (result.action === 'suggestTitle') {
      const cleanTitle = result.text.trim()
      if (onUpdateNoteTitle) {
        onUpdateNoteTitle(note.id, cleanTitle)
      } else {
        onEditProperty?.(note.id, 'title', cleanTitle)
        const lines = currentBody.split(/\r?\n/)
        const firstContentIndex = lines.findIndex((line) => line.trim().length > 0)
        if (firstContentIndex >= 0 && (lines[firstContentIndex]?.trim() === '#' || lines[firstContentIndex]?.trim().startsWith('# '))) {
          lines[firstContentIndex] = `# ${cleanTitle}`
          const withTitle = writeFrontmatterValue(rawDocument, 'title', cleanTitle)
          onUpdateContent?.(note.id, mobileDocumentWithBody(withTitle, lines.join('\n')))
        }
      }
      setApplied(true)
    } else if (result.action === 'generateTags' && result.items) {
      const existingTags = note.tags ?? []
      const merged = Array.from(new Set([...existingTags, ...result.items]))
      if (onUpdateContent) {
        const nextDocument = writeFrontmatterValue(rawDocument, 'tags', merged)
        onUpdateContent(note.id, nextDocument)
      } else {
        onEditProperty?.(note.id, 'tags', merged)
      }
      setApplied(true)
    } else if (result.action === 'summarize') {
      const summaryBlock = `> **Zusammenfassung:**\n> ${result.text.replace(/\n/g, '\n> ')}\n\n`
      const nextBody = insertSummaryIntoBody(currentBody, summaryBlock)
      onUpdateContent?.(note.id, mobileDocumentWithBody(rawDocument, nextBody))
      setApplied(true)
    } else if (result.action === 'extractTodos') {
      const todoBlock = `\n\n## To-Dos\n${result.text}\n`
      onUpdateContent?.(note.id, `${rawDocument.trimEnd()}${todoBlock}`)
      setApplied(true)
    } else if (result.action === 'analyzeLink') {
      const suggestedTitle = result.draft?.title?.trim() || note.title || 'Link-Analyse'
      let nextDocument = rawDocument
      if (result.draft?.tags && result.draft.tags.length > 0) {
        const existingTags = note.tags ?? []
        const mergedTags = Array.from(new Set([...existingTags, ...result.draft.tags]))
        nextDocument = writeFrontmatterValue(nextDocument, 'tags', mergedTags)
      }
      const nextBody = isNoteOnlyLink(currentBody)
        ? `# ${suggestedTitle}\n\n${result.text.trim()}\n`
        : `${currentBody.trimEnd()}\n\n${result.text.trim()}\n`
      if (isNoteOnlyLink(currentBody) && result.draft?.title) {
        nextDocument = writeFrontmatterValue(nextDocument, 'title', suggestedTitle)
        onUpdateNoteTitle?.(note.id, suggestedTitle)
      }
      onUpdateContent?.(note.id, mobileDocumentWithBody(nextDocument, nextBody))
      setApplied(true)
    }
  }

  const handleCopy = async () => {
    if (result?.text) {
      await ClipboardUtil.setStringAsync(result.text)
      setApplied(true)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} testID="smart-notes-content">
      {/* On-Device Badge */}
      <View style={styles.badgeBanner}>
        <Sparkle color={mobileColors.primary} size={18} weight="fill" />
        <View style={styles.badgeTextContainer}>
          <Text style={styles.badgeTitle}>Gemini Nano • Lokale On-Device KI</Text>
          <Text style={styles.badgeSubtitle}>100% offline, latenzfrei und privat auf deinem Gerät</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionGrid}>
        <SmartActionCard
          active={activeAction === 'summarize'}
          icon={<TextAlignLeft color={mobileColors.primary} size={22} />}
          label="Zusammenfassen"
          subtitle="2-4 Kernaussagen extrahieren"
          onPress={() => handleAction('summarize')}
        />
        <SmartActionCard
          active={activeAction === 'suggestTitle'}
          icon={<Lightbulb color={mobileColors.primary} size={22} />}
          label="Titel vorschlagen"
          subtitle="Prägnanten Notiztitel finden"
          onPress={() => handleAction('suggestTitle')}
        />
        <SmartActionCard
          active={activeAction === 'generateTags'}
          icon={<Tag color={mobileColors.primary} size={22} />}
          label="Tags generieren"
          subtitle="3-5 passende Schlagwörter"
          onPress={() => handleAction('generateTags')}
        />
        <SmartActionCard
          active={activeAction === 'extractTodos'}
          icon={<ListChecks color={mobileColors.primary} size={22} />}
          label="To-Dos extrahieren"
          subtitle="Aufgaben & Checklisten erkennen"
          onPress={() => handleAction('extractTodos')}
        />
        <SmartActionCard
          active={activeAction === 'analyzeLink'}
          icon={<Globe color={mobileColors.primary} size={22} />}
          label="Link-Analyse"
          subtitle="Webseite oder Video abrufen & zusammenfassen"
          onPress={() => handleAction('analyzeLink')}
        />
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={mobileColors.primary} size="small" />
          <Text style={styles.loadingText}>
            {activeAction === 'analyzeLink'
              ? 'Lade Link-Inhalt & erstelle KI-Analyse...'
              : 'Gemini Nano verarbeitet Notizinhalt...'}
          </Text>
        </View>
      )}

      {/* Result box */}
      {!loading && result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultLabel}>Ergebnis:</Text>
            {applied && (
              <View style={styles.appliedPill}>
                <Check color={mobileColors.green} size={14} weight="bold" />
                <Text style={styles.appliedText}>Angewendet</Text>
              </View>
            )}
          </View>
          <Text style={styles.resultBody}>{result.text || 'Kein passender Inhalt gefunden.'}</Text>

          <View style={styles.resultActions}>
            <MobileButton
              icon={<Clipboard color={mobileColors.text} size={16} />}
              label="Kopieren"
              variant="secondary"
              onPress={handleCopy}
            />
            {result.action === 'suggestTitle' && (
              <MobileButton
                disabled={applied}
                icon={<Check color={mobileColors.textInverse} size={16} />}
                label="Als Titel übernehmen"
                variant="primary"
                onPress={handleApply}
              />
            )}
            {result.action === 'generateTags' && (
              <MobileButton
                disabled={applied}
                icon={<Check color={mobileColors.textInverse} size={16} />}
                label="Tags hinzufügen"
                variant="primary"
                onPress={handleApply}
              />
            )}
            {result.action === 'summarize' && (
              <MobileButton
                disabled={applied}
                icon={<Check color={mobileColors.textInverse} size={16} />}
                label="An Notizanfang einfügen"
                variant="primary"
                onPress={handleApply}
              />
            )}
            {result.action === 'extractTodos' && (
              <MobileButton
                disabled={applied}
                icon={<Check color={mobileColors.textInverse} size={16} />}
                label="Als Checkliste anfügen"
                variant="primary"
                onPress={handleApply}
              />
            )}
            {result.action === 'analyzeLink' && (
              <MobileButton
                disabled={applied}
                icon={<Check color={mobileColors.textInverse} size={16} />}
                label="Link-Analyse in Notiz übernehmen"
                variant="primary"
                onPress={handleApply}
              />
            )}
          </View>
        </View>
      )}

      <View style={styles.footerSpacing}>
        <MobileButton label="Schließen" variant="ghost" onPress={onClose} />
      </View>
    </ScrollView>
  )
}

function SmartActionCard({
  active,
  icon,
  label,
  onPress,
  subtitle,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  subtitle: string
  onPress: () => void
}) {
  const { styles } = useMobileStyles(createThemeStyles)
  return (
    <View style={[styles.actionCard, active ? styles.actionCardActive : null]}>
      <View style={styles.actionCardIcon}>{icon}</View>
      <View style={styles.actionCardBody}>
        <Text style={styles.actionCardTitle}>{label}</Text>
        <Text style={styles.actionCardSubtitle}>{subtitle}</Text>
      </View>
      <MobileButton label="Start" variant={active ? 'primary' : 'secondary'} onPress={onPress} />
    </View>
  )
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, type: mobileType } = metrics
  const styles = StyleSheet.create({
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: mobileSpace.md,
      borderRadius: metrics.size(10),
      backgroundColor: mobileColors.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: mobileColors.border,
      gap: mobileSpace.sm,
    },
    actionCardActive: {
      borderColor: mobileColors.primary,
      backgroundColor: mobileColors.graySoft,
    },
    actionCardBody: {
      flex: 1,
      minWidth: 0,
    },
    actionCardIcon: {
      padding: metrics.size(4),
    },
    actionCardSubtitle: {
      color: mobileColors.textMuted,
      fontSize: mobileType.caption,
      marginTop: 2,
    },
    actionCardTitle: {
      color: mobileColors.text,
      fontSize: mobileType.body,
      fontWeight: '600',
    },
    actionGrid: {
      gap: mobileSpace.sm,
    },
    appliedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    appliedText: {
      color: mobileColors.green,
      fontSize: mobileType.micro,
      fontWeight: '600',
    },
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
    container: {
      padding: mobileSpace.lg,
      gap: mobileSpace.md,
    },
    footerSpacing: {
      marginTop: mobileSpace.sm,
      alignItems: 'center',
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
    resultActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: mobileSpace.sm,
      marginTop: mobileSpace.sm,
    },
    resultBody: {
      color: mobileColors.text,
      fontSize: mobileType.body,
      lineHeight: metrics.size(20),
    },
    resultCard: {
      padding: mobileSpace.md,
      borderRadius: metrics.size(8),
      backgroundColor: mobileColors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: mobileColors.border,
      gap: mobileSpace.sm,
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    resultLabel: {
      color: mobileColors.textMuted,
      fontSize: mobileType.caption,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
  })
  return { styles, mobileColors }
}
