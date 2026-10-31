import { normalizedFrontmatterKey } from './mobileEditableNote'
import type { MobileCreateNoteDefaults, MobileNote, MobileWorkspaceSnapshot } from './mobileWorkspaceModel'
import { mobileCreateRelationshipTargetDefaults } from './mobileCreateNoteDefaults'
import { applyMobileFolderEdit } from './mobileWorkspaceFolderEditing'
import { preserveHydratedNoteTimestamps } from './mobileWorkspaceHydration'
import { mobileFilenameStemForTitle, validateMobileMoveNoteFolderPath, validateMobileRenameNoteFilePath } from './mobileNotePaths'
import { movedNoteWikilinkRewrite, noteWritePath } from './mobileWorkspacePathRewrites'
import { movedWorkspaceNote, moveNoteWrites, moveWorkspaceNotes, renamedWorkspaceNoteFile } from './mobileWorkspaceNoteMoves'
import { mobileTypeDefinitionWikilinkWritesForWorkspaceWrites, rewriteMobileTypeDefinitionWikilinks } from './mobileTypeDefinitionPathRewrites'
import { mobileNoteForWikilinkTarget, mobileWikilinkTargetForNote, parseMobileWikilink } from './mobileWikilinks'
import { applyMobilePropertyDisplayModeEdit } from './mobilePropertyDisplayModeEditing'
import { applyMobileTypeEdit } from './mobileWorkspaceTypeEditing'
import { applyMobileRestorationEdit } from './mobileWorkspaceRestoration'
import { moveMobileFavorite } from './mobileWorkspaceFavoriteOrdering'
import type { FrontmatterKey, MarkdownContent, NoteId, NoteTitle, WikilinkTarget, MobileWorkspaceEdit, MobileNoteEdit, MobileWorkspaceResultHandlerMap, MobileWorkspaceWrite, MobileWorkspaceEditResult, TitlePropertyUpdateEdit } from './mobileWorkspaceEditing.types'
import { rebuildSnapshot, snapshotWithResolvedNotes, notesWithDetailedNotes, workspaceNotePool, workspaceNoteById, saveNoteWrites } from './mobileWorkspaceSnapshotEdits'
import { applyMobileNoteEdit } from './mobileWorkspaceNoteMutations'
import { createMobileNoteResult } from './mobileWorkspaceNoteCreation'
import { createMobileView, updateMobileView, deleteMobileView, moveMobileView, updatePrimaryNoteListProperties, setDefaultNoteWidth } from './mobileWorkspaceViewEdits'

export { normalizedDisplayProperties } from './mobileVaultConfig'

export const mobileWorkspaceResultHandlers = new Map(Object.entries({
  bulkEdit: (snapshot, edit) => applyMobileBulkWorkspaceEdit(snapshot, edit),
  createFolder: (snapshot, edit) => applyMobileFolderEdit(snapshot, edit, rebuildSnapshot),
  createNote: (snapshot, edit) => createMobileNoteResult(snapshot, edit.title, edit.defaults),
  createRelationshipTarget: (snapshot, edit) => createRelationshipTarget(snapshot, edit),
  createTypeDefinition: (snapshot, edit) => applyMobileTypeEdit(snapshot, edit, rebuildSnapshot),
  deleteFolder: (snapshot, edit) => applyMobileFolderEdit(snapshot, edit, rebuildSnapshot),
  createView: (snapshot, edit) => createMobileView(snapshot, edit.definition),
  deleteNote: (snapshot, edit) => deleteMobileNote(snapshot, edit.noteId),
  deleteTypeDefinition: (snapshot, edit) => applyMobileTypeEdit(snapshot, edit, rebuildSnapshot),
  deleteView: (snapshot, edit) => deleteMobileView(snapshot, edit.viewId),
  moveFavorite: (snapshot, edit) => moveMobileFavorite({
    direction: edit.direction,
    noteId: edit.noteId,
    rebuildSnapshot,
    snapshot,
  }),
  moveView: (snapshot, edit) => moveMobileView(snapshot, edit.viewId, edit.direction),
  moveTypeSection: (snapshot, edit) => applyMobileTypeEdit(snapshot, edit, rebuildSnapshot),
  moveNoteToFolder: (snapshot, edit) => moveNoteToFolder(snapshot, edit),
  renameTypeDefinition: (snapshot, edit) => applyMobileTypeEdit(snapshot, edit, rebuildSnapshot),
  renameFolder: (snapshot, edit) => applyMobileFolderEdit(snapshot, edit, rebuildSnapshot),
  renameNoteFile: (snapshot, edit) => renameNoteFile(snapshot, edit),
  restoreFolder: (snapshot, edit) => applyMobileRestorationEdit(snapshot, edit, rebuildSnapshot),
  restoreNote: (snapshot, edit) => applyMobileRestorationEdit(snapshot, edit, rebuildSnapshot),
  restoreTypeDefinition: (snapshot, edit) => applyMobileRestorationEdit(snapshot, edit, rebuildSnapshot),
  restoreView: (snapshot, edit) => applyMobileRestorationEdit(snapshot, edit, rebuildSnapshot),
  setDefaultNoteWidth: (snapshot, edit) => setDefaultNoteWidth(snapshot, edit.mode),
  updatePropertyDisplayMode: applyMobilePropertyDisplayModeEdit,
  updatePrimaryNoteListProperties: (snapshot, edit) => updatePrimaryNoteListProperties(snapshot, edit),
  updateTypeDefinition: (snapshot, edit) => applyMobileTypeEdit(snapshot, edit, rebuildSnapshot),
  updateProperty: (snapshot, edit) => updateMobileNoteProperty(snapshot, edit),
  updateView: (snapshot, edit) => updateMobileView(snapshot, edit.viewId, edit.definition),
} satisfies MobileWorkspaceResultHandlerMap))

export const mobileNoteEditTypes = new Set<MobileWorkspaceEdit['type']>([
  'addRelationship',
  'changeNoteType',
  'deleteProperty',
  'hydrateNoteContent',
  'hydrateTextFileContent',
  'removeRelationship',
  'setArchived',
  'setOrganized',
  'toggleFavorite',
  'updateChecklistItem',
  'updateNoteContent',
  'updateProperty',
  'updateTextFileContent',
])

export function applyMobileWorkspaceEdit(
  snapshot: MobileWorkspaceSnapshot,
  edit: MobileWorkspaceEdit,
): MobileWorkspaceSnapshot {
  return applyMobileWorkspaceEditWithWrites(snapshot, edit).snapshot
}

export function applyMobileWorkspaceEditWithWrites(
  snapshot: MobileWorkspaceSnapshot,
  edit: MobileWorkspaceEdit,
): MobileWorkspaceEditResult {
  const handledResult = applyMobileWorkspaceResultHandler(snapshot, edit)
  if (handledResult) return handledResult
  if (!isMobileNoteEdit(edit)) return { snapshot, writes: [] }

  return applyMobileNoteEditResult(snapshot, edit)
}

export function applyMobileBulkWorkspaceEdit(
  snapshot: MobileWorkspaceSnapshot,
  edit: Extract<MobileWorkspaceEdit, { type: 'bulkEdit' }>,
): MobileWorkspaceEditResult {
  return edit.edits.reduce<MobileWorkspaceEditResult>((result, childEdit) => {
    const nextResult = applyMobileWorkspaceEditWithWrites(result.snapshot, childEdit)
    return {
      snapshot: nextResult.snapshot,
      writes: [...result.writes, ...nextResult.writes],
    }
  }, { snapshot, writes: [] })
}

export function applyMobileNoteEditResult(
  snapshot: MobileWorkspaceSnapshot,
  edit: MobileNoteEdit,
): MobileWorkspaceEditResult {
  const notePool = workspaceNotePool(snapshot)
  const target = workspaceNoteById(snapshot, edit.noteId)
  if (!target) return { snapshot, writes: [] }
  const edited = applyMobileNoteEdit(target, notePool, edit, snapshot.typeDefinitions)
  const replaceTarget = (note: MobileNote) => note.id === edited.id ? edited : note
  const notes = snapshot.notes.map(replaceTarget)
  const allNotes = snapshot.allNotes?.map(replaceTarget)
  const updated = { ...snapshot, allNotes, notes }
  const hydrationId = edit.type === 'hydrateNoteContent' || edit.type === 'hydrateTextFileContent' ? edit.noteId : undefined
  const rebuiltSnapshot = isNoteFlagEdit(edit)
    ? snapshotWithResolvedNotes(updated, notes, allNotes ?? notes)
    : rebuildSnapshot(updated, notes, allNotes, hydrationId)
  const previousNote = edit.type === 'hydrateNoteContent' ? workspaceNoteById(snapshot, edit.noteId) : null
  const nextSnapshot = preserveHydratedNoteTimestamps(rebuiltSnapshot, previousNote)

  return {
    snapshot: nextSnapshot,
    writes: saveNoteWrites(snapshot, nextSnapshot, edit),
  }
}

export function isNoteFlagEdit(edit: MobileNoteEdit) {
  return edit.type === 'toggleFavorite' || edit.type === 'setArchived' || edit.type === 'setOrganized'
}

export function updateMobileNoteProperty(
  snapshot: MobileWorkspaceSnapshot,
  edit: Extract<MobileWorkspaceEdit, { type: 'updateProperty' }>,
): MobileWorkspaceEditResult {
  const result = applyMobileNoteEditResult(snapshot, edit)
  if (!isTitlePropertyUpdate(edit)) return result

  return renameNoteFileAfterTitlePropertyUpdate(snapshot, result, edit)
}

export function renameNoteFileAfterTitlePropertyUpdate(
  previousSnapshot: MobileWorkspaceSnapshot,
  result: MobileWorkspaceEditResult,
  edit: TitlePropertyUpdateEdit,
): MobileWorkspaceEditResult {
  const previousNote = workspaceNoteById(previousSnapshot, edit.noteId)
  const nextNote = workspaceNoteById(result.snapshot, edit.noteId)
  if (!previousNote || !nextNote?.rawContent) return result

  const filenameStem = mobileFilenameStemForTitle(edit.value)
  const validation = validateMobileRenameNoteFilePath({
    filenameStem,
    note: nextNote,
    notes: workspaceNotePool(previousSnapshot),
  })
  if (validation !== 'ok') return result

  const movedNoteResult = moveNoteToPath(
    result.snapshot,
    previousNote,
    renamedWorkspaceNoteFile(nextNote, filenameStem),
  )

  return {
    snapshot: movedNoteResult.snapshot,
    writes: [...result.writes, ...movedNoteResult.writes],
  }
}

export function isTitlePropertyUpdate(
  edit: Extract<MobileWorkspaceEdit, { type: 'updateProperty' }>,
): edit is TitlePropertyUpdateEdit {
  return normalizedFrontmatterKey(edit.key) === 'title'
    && typeof edit.value === 'string'
    && edit.value.trim().length > 0
}

export function isMobileNoteEdit(edit: MobileWorkspaceEdit): edit is MobileNoteEdit {
  return mobileNoteEditTypes.has(edit.type)
}

export function applyMobileWorkspaceResultHandler(
  snapshot: MobileWorkspaceSnapshot,
  edit: MobileWorkspaceEdit,
): MobileWorkspaceEditResult | null {
  const handler = mobileWorkspaceResultHandlers.get(edit.type) as
    | ((snapshot: MobileWorkspaceSnapshot, edit: MobileWorkspaceEdit) => MobileWorkspaceEditResult)
    | undefined
  return handler?.(snapshot, edit) ?? null
}

export function mobileWikilinkSuggestions(notes: MobileNote[], query: string): MobileNote[] {
  const normalizedQuery = query.trim().toLowerCase()
  const activeNotes = notes.filter((note) => !note.archived)

  if (!normalizedQuery) {
    return activeNotes.slice(0, 8)
  }

  return activeNotes
    .filter((note) => wikilinkSearchText(note).includes(normalizedQuery))
    .slice(0, 8)
}

export function replaceTrailingWikilinkQuery(
  content: MarkdownContent,
  query: string,
  selectedNote: MobileNote,
): MarkdownContent {
  const target = mobileWikilinkTargetForNote(selectedNote)
  const replacement = `[[${target}]]`
  const suffix = `[[${query}`
  if (content.endsWith(suffix)) return `${content.slice(0, -suffix.length)}${replacement}`
  return `${content}${replacement}`
}

export function trailingWikilinkQuery(content: MarkdownContent): string | null {
  const match = content.match(/\[\[([^\]\n]*)$/)
  return match ? match[1] : null
}

export function deleteMobileNote(snapshot: MobileWorkspaceSnapshot, noteId: NoteId): MobileWorkspaceEditResult {
  const previousNote = workspaceNoteById(snapshot, noteId)
  if (!previousNote) return { snapshot, writes: [] }

  const notes = snapshot.notes.filter((note) => note.id !== previousNote.id)
  const allNotes = snapshot.allNotes?.filter((note) => note.id !== previousNote.id)
  const nextSnapshot = rebuildSnapshot({ ...snapshot, allNotes }, notes, allNotes)

  return {
    snapshot: nextSnapshot,
    writes: [{ kind: 'deleteNote', path: noteWritePath(previousNote) }],
  }
}

export function moveNoteToFolder(
  snapshot: MobileWorkspaceSnapshot,
  edit: Extract<MobileWorkspaceEdit, { type: 'moveNoteToFolder' }>,
): MobileWorkspaceEditResult {
  const previousNote = workspaceNoteById(snapshot, edit.noteId)
  if (!previousNote) return { snapshot, writes: [] }
  if (validateMobileMoveNoteFolderPath({
    folderPath: edit.folderPath,
    folderPaths: snapshot.folderPaths,
    note: previousNote,
    notes: workspaceNotePool(snapshot),
  }) !== 'ok') return { snapshot, writes: [] }

  return moveNoteToPath(snapshot, previousNote, movedWorkspaceNote(previousNote, edit.folderPath))
}

export function renameNoteFile(
  snapshot: MobileWorkspaceSnapshot,
  edit: Extract<MobileWorkspaceEdit, { type: 'renameNoteFile' }>,
): MobileWorkspaceEditResult {
  const previousNote = workspaceNoteById(snapshot, edit.noteId)
  if (!previousNote) return { snapshot, writes: [] }
  if (validateMobileRenameNoteFilePath({
    filenameStem: edit.filenameStem,
    note: previousNote,
    notes: workspaceNotePool(snapshot),
  }) !== 'ok') return { snapshot, writes: [] }

  return moveNoteToPath(snapshot, previousNote, renamedWorkspaceNoteFile(previousNote, edit.filenameStem))
}

export function moveNoteToPath(
  snapshot: MobileWorkspaceSnapshot,
  previousNote: MobileNote,
  nextNote: MobileNote,
): MobileWorkspaceEditResult {
  const previousPool = snapshot.allNotes
    ? notesWithDetailedNotes(snapshot.allNotes, snapshot.notes)
    : snapshot.notes
  const nextPath = noteWritePath(nextNote)
  if (noteWritePath(previousNote) === nextPath) return { snapshot, writes: [] }

  const rewrite = movedNoteWikilinkRewrite(previousNote, nextNote)
  const nextPool = moveWorkspaceNotes(previousPool, previousNote, nextNote, rewrite)
  const nextNotes = moveWorkspaceNotes(snapshot.notes, previousNote, nextNote, rewrite)
  const nextAllNotes = snapshot.allNotes ? nextPool : undefined
  const nextSelectedNoteId = snapshot.selectedNoteId === previousNote.id ? nextNote.id : snapshot.selectedNoteId
  const nextTypeDefinitions = rewriteMobileTypeDefinitionWikilinks(snapshot.typeDefinitions, [rewrite])
  const nextSnapshot = rebuildSnapshot(
    { ...snapshot, allNotes: nextAllNotes, selectedNoteId: nextSelectedNoteId, typeDefinitions: nextTypeDefinitions },
    nextNotes,
    nextAllNotes,
  )
  const writes = moveNoteWrites(previousNote, nextNote, previousPool, nextPool)

  return {
    snapshot: nextSnapshot,
    writes: [
      ...writes,
      ...mobileTypeDefinitionWikilinkWritesForWorkspaceWrites(
        snapshot.typeDefinitions,
        nextTypeDefinitions,
        writes,
      ),
    ],
  }
}

export function createRelationshipTarget(
  snapshot: MobileWorkspaceSnapshot,
  edit: Extract<MobileWorkspaceEdit, { type: 'createRelationshipTarget' }>,
): MobileWorkspaceEditResult {
  const sourceNote = workspaceNoteById(snapshot, edit.sourceNoteId)
  const targetTitle = edit.targetTitle.trim()
  const relationshipKey = edit.key.trim()
  if (!sourceNote?.rawContent || !targetTitle || !relationshipKey) return { snapshot, writes: [] }

  const explicitTarget = relationshipTargetWikilinkTarget(edit.targetRef) ?? relationshipTargetWikilinkTarget(targetTitle)
  const existingTargetNote = explicitTarget
    ? mobileNoteForWikilinkTarget(workspaceNotePool(snapshot), explicitTarget)
    : null
  if (existingTargetNote) {
    return relationshipTargetEditResult({
      createWrites: [],
      relationshipKey,
      snapshot,
      sourceNote,
      targetNote: existingTargetNote,
    })
  }

  return createNewRelationshipTarget({
    defaults: edit.defaults,
    relationshipKey,
    snapshot,
    sourceNote,
    targetTitle,
  })
}

export function relationshipTargetWikilinkTarget(value: string | undefined): WikilinkTarget | null {
  const target = parseMobileWikilink(value ?? '')?.target.trim()
  return target || null
}

export function createNewRelationshipTarget({
  defaults,
  relationshipKey,
  snapshot,
  sourceNote,
  targetTitle,
}: {
  defaults?: MobileCreateNoteDefaults
  relationshipKey: FrontmatterKey
  snapshot: MobileWorkspaceSnapshot
  sourceNote: MobileNote
  targetTitle: NoteTitle
}): MobileWorkspaceEditResult {
  const targetResult = createMobileNoteResult(
    snapshot,
    targetTitle,
    mobileCreateRelationshipTargetDefaults({
      defaults,
      relationshipKey,
      sourceNote,
      typeDefinitions: snapshot.typeDefinitions,
    }),
  )
  const targetSnapshot = targetResult.snapshot
  const targetNote = workspaceNoteById(targetSnapshot, targetSnapshot.selectedNoteId ?? '')
  if (!targetNote?.rawContent || targetResult.writes.length === 0) return { snapshot, writes: [] }

  return relationshipTargetEditResult({
    createWrites: targetResult.writes,
    relationshipKey,
    snapshot: targetSnapshot,
    sourceNote,
    targetNote,
  })
}

export function relationshipTargetEditResult({
  createWrites,
  relationshipKey,
  snapshot,
  sourceNote,
  targetNote,
}: {
  createWrites: MobileWorkspaceWrite[]
  relationshipKey: FrontmatterKey
  snapshot: MobileWorkspaceSnapshot
  sourceNote: MobileNote
  targetNote: MobileNote
}): MobileWorkspaceEditResult {
  const result = applyMobileNoteEditResult(snapshot, {
    key: relationshipKey,
    noteId: sourceNote.id,
    targetRef: `[[${mobileWikilinkTargetForNote(targetNote, sourceNote)}]]`,
    targetTitle: targetNote.title,
    type: 'addRelationship',
  })

  return {
    snapshot: {
      ...result.snapshot,
      selectedNoteId: targetNote.id,
    },
    writes: [...createWrites, ...result.writes],
  }
}

export function wikilinkSearchText(note: MobileNote): string {
  return [note.title, note.type, note.path ?? '', ...(note.aliases ?? []), note.tags.join(' ')].join(' ').toLowerCase()
}

export type { MobileWorkspaceEdit, MobileWorkspaceWrite, MobileWorkspaceEditResult } from './mobileWorkspaceEditing.types'
