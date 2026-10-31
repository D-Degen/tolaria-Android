import { useState, useMemo, useCallback } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import type { EditorBridge } from '@10play/tentap-editor'
import { CalendarBlank, Check, X } from 'phosphor-react-native'
import { Text } from '../ui/text'
import { Button } from '../ui/button'
import { useMobileColors } from '../../ui/theme/useMobileTheme'
import { mobileIsoDate, mobileShiftIsoDate, normalizeDue } from '../../workspace/mobileTasks'
import { insertPlainTextIntoNativeEditor } from './mobileNativeEditorOperations'

type Props = {
  editor: EditorBridge
  onInsertDate?: (due: string) => void
}

export function MobileTaskDueToolbarAffordance({ editor, onInsertDate }: Props) {
  const colors = useMobileColors()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [invalidInput, setInvalidInput] = useState(false)

  const today = useMemo(() => mobileIsoDate(new Date()), [])
  const tomorrow = useMemo(() => mobileShiftIsoDate(today, 1), [today])
  const nextWeek = useMemo(() => mobileShiftIsoDate(today, 7), [today])

  const handlePick = useCallback((due: string) => {
    const normalized = normalizeDue(due)
    if (!normalized) return
    void insertPlainTextIntoNativeEditor(editor, { text: ` 📅 ${normalized}` })
    onInsertDate?.(normalized)
    setPickerOpen(false)
    setCustomInput('')
  }, [editor, onInsertDate])

  const quickOptions = [
    { id: 'today', label: 'Heute', due: today },
    { id: 'tomorrow', label: 'Morgen', due: tomorrow },
    { id: 'nextWeek', label: 'In 1 Woche', due: nextWeek },
  ]

  const submitCustom = () => {
    const normalized = normalizeDue(customInput)
    if (!normalized) {
      setInvalidInput(true)
      return
    }
    setInvalidInput(false)
    handlePick(normalized)
  }

  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderBottomColor: colors.border }]} testID="task-due-affordance-bar">
      <View style={styles.leading}>
        <CalendarBlank color={colors.primary} size={15} />
        <Text style={[styles.label, { color: colors.textMuted }]}>Fälligkeit:</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        {quickOptions.map((opt) => (
          <Pressable
            accessibilityRole="button"
            key={opt.id}
            style={[styles.chip, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}
            testID={`task-due-chip-${opt.id}`}
            onPress={() => handlePick(opt.due)}
          >
            <Text style={[styles.chipText, { color: colors.primary }]}>{opt.label}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          style={[styles.chip, { backgroundColor: colors.graySoft, borderColor: colors.border }]}
          testID="task-due-chip-custom"
          onPress={() => setPickerOpen(true)}
        >
          <Text style={[styles.chipText, { color: colors.text }]}>Datum...</Text>
        </Pressable>
      </ScrollView>

      {pickerOpen ? (
        <Modal
          animationType="fade"
          transparent
          visible={pickerOpen}
          onRequestClose={() => setPickerOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
            <Pressable style={[styles.modalCard, { backgroundColor: colors.dialog, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <CalendarBlank color={colors.primary} size={18} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Fälligkeitsdatum wählen</Text>
                </View>
                <Pressable hitSlop={8} onPress={() => setPickerOpen(false)}>
                  <X color={colors.textMuted} size={18} />
                </Pressable>
              </View>

              <View style={styles.quickGrid}>
                {quickOptions.map((opt) => (
                  <Button
                    key={opt.id}
                    size="sm"
                    variant="outline"
                    onPress={() => handlePick(opt.due)}
                  >
                    <Text>{opt.label}</Text>
                  </Button>
                ))}
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  autoFocus
                  placeholder="JJJJ-MM-TT oder TT.MM.JJJJ"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.textInput,
                    {
                      borderColor: invalidInput ? colors.danger : colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={customInput}
                  onChangeText={(val) => {
                    setCustomInput(val)
                    if (invalidInput) setInvalidInput(false)
                  }}
                  onSubmitEditing={submitCustom}
                />
                <Button size="sm" variant="default" onPress={submitCustom}>
                  <Check color={colors.textInverse} size={16} />
                  <Text style={{ color: colors.textInverse, marginLeft: 4 }}>Setzen</Text>
                </Button>
              </View>
              {invalidInput ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  Bitte gültiges Datum eingeben (z. B. 2026-10-31 oder 31.10.2026)
                </Text>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 38,
    paddingHorizontal: 8,
  },
  chip: {
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 11,
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  leading: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 8,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 380,
    padding: 16,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  scrollContent: {
    alignItems: 'center',
  },
  textInput: {
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    fontSize: 13,
    height: 36,
    paddingHorizontal: 10,
  },
})
