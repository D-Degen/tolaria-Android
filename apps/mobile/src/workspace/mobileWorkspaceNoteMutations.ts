import { deriveEditableNote, humanizeKey, normalizedFrontmatterKey, type EditableNoteInput } from './mobileEditableNote'
import { frontmatterRelationships, parseLocalVaultDocument } from './localVaultFrontmatter'
import { mobileDocumentBody, mobileDocumentWithBody } from './mobileDocumentContent'
import type { MobileNote, MobileRelationship, MobileRelationshipValue, MobileTypeDefinitions } from './mobileWorkspaceModel'
import { mobileNoteForWikilinkTarget, mobileWikilinkTargetForNote, parseMobileWikilink } from './mobileWikilinks'
import { isMobileNoteHydration } from './mobileNoteRead'
import { applyMobileTextFileContentEdit, canApplyMobileMarkdownEdit, isMobileTextFileContentEdit, mobileTextFileNoteWithContent } from './mobileTextFileEditing'
import { relationshipKindForKey } from '../../../../src/utils/relationshipKeys'
import type { FrontmatterKey, NoteTitle, WikilinkRef, WikilinkTarget, MobileNoteEdit, AddRelationshipInput, MobileNoteEditHandler } from './mobileWorkspaceEditing.types'
import { applyChecklistItemChange } from './mobileTasks'
import { deriveEditedNote, withEditableContent, writeFrontmatterValue, slugifyTitle } from './mobileWorkspaceNoteContent'

export const mobileNoteEditHandlers = new Map(Object.entries({
  addRelationship: ({ editableNote, notes }, edit) => {
    if (edit.type !== 'addRelationship') return editableNote
    return addRelationship({
      key: edit.key,
      note: editableNote,
      notes,
      targetRef: edit.targetRef,
      targetTitle: edit.targetTitle,
    })
  },
  changeNoteType: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'changeNoteType') return editableNote
    return changeNoteType(editableNote, edit.value, typeDefinitions)
  },
  deleteProperty: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'deleteProperty') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, edit.key, null), typeDefinitions)
  },
  hydrateNoteContent: ({ editableNote, note, typeDefinitions }, edit) => {
    if (edit.type !== 'hydrateNoteContent') return editableNote
    const hydratedNote = deriveEditedNote(editableNote, edit.rawContent, typeDefinitions)
    return {
      ...hydratedNote,
      modified: note.modified,
      modifiedAt: note.modifiedAt,
    }
  },
  hydrateTextFileContent: ({ note }, edit) => {
    if (edit.type !== 'hydrateTextFileContent') return note
    return mobileTextFileNoteWithContent(note, edit.rawContent)
  },
  removeRelationship: ({ editableNote }, edit) => {
    if (edit.type !== 'removeRelationship') return editableNote
    return removeRelationship(editableNote, edit.key, edit.ref)
  },
  setArchived: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'setArchived') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, '_archived', edit.archived), typeDefinitions)
  },
  setOrganized: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'setOrganized') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, '_organized', edit.organized), typeDefinitions)
  },
  toggleFavorite: ({ editableNote, note, notes, typeDefinitions }, edit) => {
    if (edit.type !== 'toggleFavorite') return editableNote
    return toggleFavorite(editableNote, note, notes, typeDefinitions)
  },
  updateChecklistItem: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'updateChecklistItem') return editableNote
    const nextContent = applyChecklistItemChange(editableNote.rawContent, edit.line, edit.expectedText, {
      checked: edit.checked,
      due: edit.due,
    })
    if (nextContent === editableNote.rawContent) return editableNote
    return deriveEditedNote(editableNote, nextContent, typeDefinitions)
  },
  updateNoteContent: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'updateNoteContent') return editableNote
    return deriveEditedNote(editableNote, edit.content, typeDefinitions)
  },
  updateProperty: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'updateProperty') return editableNote
    const withFrontmatter = writeFrontmatterValue(editableNote.rawContent, edit.key, edit.value)
    const syncedContent = syncInitialH1OnTitleUpdate(withFrontmatter, edit.key, edit.value)
    return deriveEditedNote(editableNote, syncedContent, typeDefinitions)
  },
  updateTextFileContent: ({ note }, edit) => {
    if (edit.type !== 'updateTextFileContent') return note
    return mobileTextFileNoteWithContent(note, edit.content)
  },
} satisfies Record<MobileNoteEdit['type'], MobileNoteEditHandler>))

export function applyMobileNoteEdit(
  note: MobileNote,
  notes: MobileNote[],
  edit: MobileNoteEdit,
  typeDefinitions?: MobileTypeDefinitions,
): MobileNote {
  if (note.id !== edit.noteId) return note
  if (isMobileNoteHydration(edit) && note.rawContent !== undefined && !isDiskRefresh(edit)) return note
  if (isMobileTextFileContentEdit(edit)) return applyMobileTextFileContentEdit(note, edit)
  if (!canApplyMobileMarkdownEdit(note)) return note

  const editableNote = withEditableContent(note)
  const handler = mobileNoteEditHandlers.get(edit.type)
  return handler ? handler({ editableNote, note, notes, typeDefinitions }, edit) : note
}

function isDiskRefresh(edit: MobileNoteEdit): boolean {
  return 'refresh' in edit && edit.refresh === true
}

export function addRelationship({
  key,
  note,
  notes,
  targetRef,
  targetTitle,
}: AddRelationshipInput): MobileNote {
  const trimmedKey = key.trim()
  const trimmedTitle = targetTitle.trim()
  if (!trimmedKey || !trimmedTitle) return note

  const ref = normalizedRelationshipRef(targetRef) ?? relationshipRefForTitle(trimmedTitle, notes, note)
  return addRelationshipRef(note, trimmedKey, ref)
}

export function addRelationshipRef(
  note: EditableNoteInput,
  key: FrontmatterKey,
  ref: WikilinkRef,
  typeDefinitions?: MobileTypeDefinitions,
): MobileNote {
  const document = parseLocalVaultDocument(note.rawContent)
  const relationships = frontmatterRelationships(document.frontmatter)
  const [writeKey, currentRefs] = relationshipEntryForKey(relationships, key)
  const nextRefs = currentRefs.includes(ref) ? currentRefs : [...currentRefs, ref]

  return deriveEditableNote({
    fallback: note,
    rawContent: writeFrontmatterValue(note.rawContent, writeKey, nextRefs),
    typeDefinitions,
  }).note
}

export function relationshipEntryForKey(
  relationships: Record<FrontmatterKey, WikilinkRef[]>,
  key: FrontmatterKey,
): [FrontmatterKey, WikilinkRef[]] {
  const normalizedKey = normalizedFrontmatterKey(key)
  return Object.entries(relationships).find(([candidateKey]) => (
    normalizedFrontmatterKey(candidateKey) === normalizedKey
  )) ?? [key, []]
}

export function removeRelationship(
  note: EditableNoteInput,
  key: FrontmatterKey,
  ref: WikilinkRef,
): MobileNote {
  const document = parseLocalVaultDocument(note.rawContent)
  const relationships = frontmatterRelationships(document.frontmatter)
  const [writeKey, currentRefs] = relationshipEntryForKey(relationships, key)
  const nextRefs = currentRefs.filter((candidate) => candidate !== ref)

  return deriveEditableNote({
    fallback: note,
    rawContent: writeFrontmatterValue(note.rawContent, writeKey, nextRefs.length > 0 ? nextRefs : null),
  }).note
}

export function changeNoteType(
  note: EditableNoteInput,
  value: NoteTitle,
  typeDefinitions?: MobileTypeDefinitions,
): MobileNote {
  const nextType = value.trim()
  if (!nextType || nextType === note.type) return note

  return deriveEditedNote(note, writeFrontmatterValue(note.rawContent, 'type', nextType), typeDefinitions)
}

export function toggleFavorite(
  note: EditableNoteInput,
  currentNote: MobileNote,
  notes: MobileNote[],
  typeDefinitions?: MobileTypeDefinitions,
): MobileNote {
  if (currentNote.favorite) {
    const withoutFavorite = writeFrontmatterValue(note.rawContent, '_favorite', null)
    return deriveEditedNote(note, writeFrontmatterValue(withoutFavorite, '_favorite_index', null), typeDefinitions)
  }

  const withFavorite = writeFrontmatterValue(note.rawContent, '_favorite', true)
  return deriveEditedNote(note, writeFrontmatterValue(withFavorite, '_favorite_index', nextFavoriteIndex(notes)), typeDefinitions)
}

export function nextFavoriteIndex(notes: MobileNote[]): number {
  return notes
    .filter((candidate) => candidate.favorite)
    .reduce((max, candidate) => Math.max(max, candidate.favoriteIndex ?? 0), 0) + 1
}

export function mobileRelationships(
  relationships: Record<FrontmatterKey, WikilinkRef[]>,
  notes: MobileNote[],
): MobileRelationship[] {
  return Object.entries(relationships).map(([key, values]) => ({
    key,
    kind: relationshipKindForKey(key),
    label: relationshipKindForKey(key) === 'custom' ? humanizeKey(key) : undefined,
    values: values.map((value) => relationshipValue(value, notes)),
  }))
}

export function relationshipValue(rawValue: WikilinkRef, notes: MobileNote[]): MobileRelationshipValue {
  const target = wikilinkTarget(rawValue)
  const note = mobileNoteForWikilinkTarget(notes, target)
  if (!note) return unresolvedRelationshipValue(rawValue, target)

  return {
    id: note.id,
    ref: rawValue,
    title: note.title,
    type: note.type,
    typeTone: note.typeTone,
  }
}

export function unresolvedRelationshipValue(rawValue: WikilinkRef, target: WikilinkTarget): MobileRelationshipValue {
  return {
    ref: rawValue,
    title: target,
    type: 'Note',
    typeTone: 'gray',
  }
}

export function relationshipRefForTitle(title: NoteTitle, notes: MobileNote[], sourceNote: MobileNote): WikilinkRef {
  if (/^\[\[[^\]]+\]\]$/.test(title)) return title
  const targetNote = mobileNoteForWikilinkTarget(notes, title)
  const target = targetNote ? mobileWikilinkTargetForNote(targetNote, sourceNote) : slugifyTitle(title)
  return `[[${target}]]`
}

export function normalizedRelationshipRef(ref: WikilinkRef | undefined): WikilinkRef | null {
  const trimmed = ref?.trim()
  if (!trimmed) return null
  if (/^\[\[[^\]]+\]\]$/.test(trimmed)) return trimmed
  return `[[${trimmed}]]`
}

export function wikilinkTarget(value: WikilinkRef): WikilinkTarget {
  return parseMobileWikilink(value)?.target ?? value.trim()
}

function syncInitialH1OnTitleUpdate(rawContent: string, key: string, value: unknown): string {
  if (normalizedFrontmatterKey(key) !== 'title' || typeof value !== 'string' || !value.trim()) {
    return rawContent
  }
  const cleanTitle = value.trim().replace(/\r?\n/gu, ' ')
  const body = mobileDocumentBody(rawContent)
  const lines = body.split(/\r?\n/)
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0)
  if (firstContentIndex < 0) return rawContent
  const firstLine = lines[firstContentIndex]?.trim() ?? ''
  if (firstLine !== '#' && !firstLine.startsWith('# ')) return rawContent
  lines[firstContentIndex] = `# ${cleanTitle}`
  return mobileDocumentWithBody(rawContent, lines.join('\n'))
}
