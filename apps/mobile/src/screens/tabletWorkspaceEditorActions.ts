import type { MobileNote, MobileNoteWidth, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import { writeMobileClipboardText } from '../workspace/mobileClipboard'
import { buildMobileDeepLinkForNote } from '../workspace/mobileDeepLinks'
import { openMobileNoteFile } from '../workspace/mobileNoteFileOpen'
import { buildMobileFilePathForNote } from '../workspace/mobileNoteFilePath'
import { revealMobileNoteFile } from '../workspace/mobileNoteFileReveal'
import { exportMobileNoteAsPdf } from '../workspace/mobilePdfExport'
import type { MobileWorkspaceEdit } from '../workspace/mobileWorkspaceEditing'
import type { ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'
import { tabletWorkspaceBulkNoteActions } from './tabletWorkspaceBulkActions'
import {
  deleteSelectedNoteEdit,
  editorContentUpdateEdit,
  setArchivedEdit,
  setDefaultNoteWidthEdit,
  setOrganizedEdit,
  toggleFavoriteEdit,
  toggleNoteWidthEdit,
  updateNoteTitleEdit,
} from './tabletWorkspaceEditorEditActions'

type ApplyWorkspaceEdit = (edit: MobileWorkspaceEdit) => void
type EditorActionContext = {
  repositoryRequest?: ReadOnlyWorkspaceRequest
  selectedNote: MobileNote | null
  workspaceSnapshot: MobileWorkspaceSnapshot
}
type EditorClipboardInput = {
  label: string
  source: string
  text: string | null
}
type EditorClipboardKind = 'deepLink' | 'filePath'

export function editorWorkspaceActions({
  applyEdit,
  repositoryRequest,
  selectedNote,
  workspaceSnapshot,
}: {
  applyEdit: ApplyWorkspaceEdit
  repositoryRequest?: ReadOnlyWorkspaceRequest
  selectedNote: MobileNote | null
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  const context = { repositoryRequest, selectedNote, workspaceSnapshot }

  return {
    onCopyDeepLink: () => {
      copyEditorClipboardText(editorClipboardInput(context, 'deepLink'))
    },
    onCopyFilePath: () => {
      copyEditorClipboardText(editorClipboardInput(context, 'filePath'))
    },
    onDeleteNote: () => {
      applyOptionalEdit(applyEdit, deleteSelectedNoteEdit(selectedNote))
    },
    onExportNoteAsPdf: () => {
      void exportMobileNoteAsPdf(selectedNote).catch((error) => {
        console.warn('[mobile-pdf-export] Failed to export PDF:', error)
      })
    },
    onOpenFileInDefaultApp: () => {
      void openMobileNoteFile({
        note: selectedNote,
        vaultRootUri: repositoryRequest?.vaultRootUri,
      }).catch((error) => {
        console.warn('[mobile-file-open] Failed to open file:', error)
      })
    },
    onRevealFile: () => {
      void revealMobileNoteFile({
        note: selectedNote,
        vaultRootUri: repositoryRequest?.vaultRootUri,
      }).catch((error) => {
        console.warn('[mobile-file-reveal] Failed to reveal file:', error)
      })
    },
    onSetArchived: (archived: boolean) => {
      applyOptionalEdit(applyEdit, setArchivedEdit(selectedNote, archived))
    },
    onSetDefaultNoteWidth: (mode: MobileNoteWidth) => {
      applyEdit(setDefaultNoteWidthEdit(mode))
    },
    onSetOrganized: (organized: boolean) => {
      applyOptionalEdit(applyEdit, setOrganizedEdit(selectedNote, organized))
    },
    onToggleFavorite: () => {
      applyOptionalEdit(applyEdit, toggleFavoriteEdit(selectedNote))
    },
    onToggleNoteFavorite: (noteId: string) => {
      const note = (workspaceSnapshot.allNotes ?? workspaceSnapshot.notes).find((candidate) => candidate.id === noteId) ?? null
      applyOptionalEdit(applyEdit, toggleFavoriteEdit(note))
    },
    onToggleNoteWidth: () => {
      applyOptionalEdit(applyEdit, toggleNoteWidthEdit(selectedNote))
    },
    onUpdateNoteContent: (noteId: string, content: string) => {
      applyOptionalEdit(applyEdit, editorContentUpdateEdit(workspaceSnapshot, noteId, content))
    },
    onUpdateNoteTitle: (noteId: string, title: string) => {
      applyOptionalEdit(applyEdit, updateNoteTitleEdit(noteId, title))
    },
    ...tabletWorkspaceBulkNoteActions(applyEdit),
  }
}

function editorClipboardInput(
  {
    repositoryRequest,
    selectedNote,
    workspaceSnapshot,
  }: EditorActionContext,
  kind: EditorClipboardKind,
): EditorClipboardInput {
  if (kind === 'deepLink') {
    const result = buildMobileDeepLinkForNote({
      note: selectedNote,
      source: workspaceSnapshot.source,
      vaultRootUri: repositoryRequest?.vaultRootUri,
    })
    return { label: 'deep link', source: 'mobile-deep-link', text: result.ok ? result.url : null }
  }

  const result = buildMobileFilePathForNote({
    note: selectedNote,
    vaultRootUri: repositoryRequest?.vaultRootUri,
  })
  return { label: 'file path', source: 'mobile-file-path', text: result.ok ? result.path : null }
}

function copyEditorClipboardText({ label, source, text }: EditorClipboardInput) {
  if (!text) return

  void writeMobileClipboardText(text).catch((error) => {
    console.warn(`[${source}] Failed to copy ${label}:`, error)
  })
}

function applyOptionalEdit(applyEdit: ApplyWorkspaceEdit, edit: MobileWorkspaceEdit | null) {
  if (edit) applyEdit(edit)
}
