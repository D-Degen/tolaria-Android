import { useCallback, useContext, useEffect, useRef, useState, type RefObject } from 'react'
import { useWorkspaceSyncEditor, WorkspaceSyncEditorsContext } from '../../workspace/workspaceSyncEditors'
import { scheduleCreatedEditorFocus } from '../../workspace/mobileEditorFocus'
import { parseLocalVaultDocument } from '../../workspace/localVaultFrontmatter'
import {
  commitMobileEditorDraft,
  createMobileEditorDraft,
  editMobileEditorDraft,
  mobileEditorDraftCommitDelayMs,
  mobileEditorDraftNeedsCommit,
  syncMobileEditorDraft,
  type MobileEditorDraftState,
} from '../../workspace/mobileEditorDraft'

type SourceInput = {
  focus: () => void
  isFocused: () => boolean
  setSelection: (start: number, end: number) => void
}

type SourceDraftOptions = {
  idleSave?: boolean
  inputRef: RefObject<SourceInput | null>
  noteId: string
  onCommit: (noteId: string, content: string) => void
  plainText?: boolean
  sourceContent: string
}

export function useMobileSourceEditorDraft({ idleSave = true, inputRef, noteId, onCommit, plainText = false, sourceContent }: SourceDraftOptions) {
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCommitRef = useRef(onCommit)
  const [draft, setDraft] = useState(() => createMobileEditorDraft(noteId, sourceContent))
  const draftRef = useRef<MobileEditorDraftState>(draft)
  const pausedRef = useRef(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => { onCommitRef.current = onCommit }, [onCommit])
  useEffect(() => { draftRef.current = draft }, [draft])
  const clearScheduledCommit = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
    commitTimerRef.current = null
  }, [])
  const flushDraft = useCallback((updateState: boolean): string => {
    clearScheduledCommit()
    const current = draftRef.current
    if (!mobileEditorDraftNeedsCommit(current)) return current.draftContent
    onCommitRef.current(current.noteId, current.draftContent)
    const committed = commitMobileEditorDraft(current)
    draftRef.current = committed
    if (updateState) setDraft(committed)
    return current.draftContent
  }, [clearScheduledCommit])
  const commitDraft = useCallback(() => flushDraft(true), [flushDraft])
  const scheduleCommit = useCallback(() => {
    clearScheduledCommit()
    commitTimerRef.current = setTimeout(commitDraft, mobileEditorDraftCommitDelayMs)
  }, [clearScheduledCommit, commitDraft])
  const updateContent = useCallback((_noteId: string, nextContent: string) => {
    if (pausedRef.current) return
    const nextDraft = editMobileEditorDraft(draftRef.current, nextContent)
    draftRef.current = nextDraft
    setDraft(nextDraft)
    if (mobileEditorDraftNeedsCommit(nextDraft) && idleSave) scheduleCommit()
    else clearScheduledCommit()
  }, [clearScheduledCommit, idleSave, scheduleCommit])
  useSourceSyncPreparation({ commitDraft, inputRef, noteId, pausedRef, setPaused })
  useEffect(() => {
    setDraft(current => {
      const nextDraft = syncMobileEditorDraft(current, { content: sourceContent, noteId })
      draftRef.current = nextDraft
      return nextDraft
    })
  }, [noteId, sourceContent])
  useCreatedSourceFocus({ draftRef, inputRef, noteId, plainText })
  useEffect(() => () => { flushDraft(false) }, [flushDraft])
  return { content: draft.draftContent, paused, save: commitDraft, updateContent }
}

function useSourceSyncPreparation({ commitDraft, inputRef, noteId, pausedRef, setPaused }: {
  commitDraft: () => void
  inputRef: RefObject<SourceInput | null>
  noteId: string
  pausedRef: { current: boolean }
  setPaused: (paused: boolean) => void
}) {
  useWorkspaceSyncEditor(async deferWhileFocused => {
    if (deferWhileFocused && inputRef.current?.isFocused()) throw new Error('editorSyncDeferred')
    commitDraft()
    pausedRef.current = true
    setPaused(true)
    return () => { pausedRef.current = false; setPaused(false) }
  }, noteId)
}

function useCreatedSourceFocus({ draftRef, inputRef, noteId, plainText }: {
  draftRef: RefObject<MobileEditorDraftState>
  inputRef: RefObject<SourceInput | null>
  noteId: string
  plainText: boolean
}) {
  const editors = useContext(WorkspaceSyncEditorsContext)
  useEffect(() => {
    if (!editors) return
    return scheduleCreatedEditorFocus({
      requests: editors.focus,
      noteId,
      isReady: () => !editors.isBlocked() && inputRef.current !== null,
      focus: () => focusSourceInput(inputRef.current, sourceStart(draftRef.current.draftContent, plainText)),
    })
  }, [draftRef, editors, inputRef, noteId, plainText])
}

function sourceStart(content: string, plainText: boolean) {
  if (plainText) return 0
  const { body } = parseLocalVaultDocument(content)
  const headingPrefix = body.match(/^\s*#[\t ]+/u)?.[0] ?? ''
  return content.length - body.length + headingPrefix.length
}

function focusSourceInput(input: SourceInput | null, position: number) {
  if (!input) return
  input.focus()
  if ('setSelectionRange' in input && typeof input.setSelectionRange === 'function') {
    input.setSelectionRange(position, position)
  } else input.setSelection(position, position)
}
