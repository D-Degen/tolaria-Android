import type { EditableNoteInput } from './mobileEditableNote'
import type { MobileAllNotesFileVisibility, MobileCreateNoteDefaults, MobileNote, MobilePropertyDisplayMode, MobileNoteWidth, MobilePropertyValue, MobileSavedView, MobileTypeDefinition, MobileTypeDefinitions, MobileViewDefinition, MobileWorkspaceSnapshot } from './mobileWorkspaceModel'
import type { MobileViewMoveDirection } from './mobileSavedViews'
import type { MobileTypeDefinitionPatch } from './mobileTypeDefinitions'

export type FrontmatterKey = string

export type MarkdownContent = string

export type TextFileContent = string

export type NoteId = string

export type NoteTitle = string

export type FolderPath = string

export type FilenameStem = string

export type WikilinkRef = string

export type WikilinkTarget = string

export type MobileWorkspaceEdit =
  | { edits: MobileWorkspaceEdit[]; type: 'bulkEdit' }
  | { content: MarkdownContent; noteId: NoteId; type: 'updateNoteContent' }
  | { content: TextFileContent; noteId: NoteId; type: 'updateTextFileContent' }
  | { defaults?: MobileCreateNoteDefaults; title: NoteTitle; type: 'createNote' }
  | { noteId: NoteId; type: 'deleteNote' }
  | { allNoteIndex?: number; note: MobileNote; noteIndex?: number; type: 'restoreNote' }
  | { noteId: NoteId; rawContent: MarkdownContent; refresh?: true; type: 'hydrateNoteContent' }
  | { noteId: NoteId; rawContent: TextFileContent; refresh?: true; type: 'hydrateTextFileContent' }
  | { key: FrontmatterKey; noteId: NoteId; value: MobilePropertyValue; type: 'updateProperty' }
  | { checked?: boolean; due?: string | null; expectedText: string; line: number; noteId: NoteId; type: 'updateChecklistItem' }
  | { key: FrontmatterKey; noteId: NoteId; type: 'deleteProperty' }
  | { key: FrontmatterKey; noteId: NoteId; targetRef?: WikilinkRef; targetTitle: NoteTitle; type: 'addRelationship' }
  | { defaults?: MobileCreateNoteDefaults; key: FrontmatterKey; sourceNoteId: NoteId; targetRef?: WikilinkRef; targetTitle: NoteTitle; type: 'createRelationshipTarget' }
  | { key: FrontmatterKey; noteId: NoteId; ref: WikilinkRef; type: 'removeRelationship' }
  | { noteId: NoteId; type: 'changeNoteType'; value: NoteTitle }
  | { folderPath: FolderPath; noteId: NoteId; type: 'moveNoteToFolder' }
  | { filenameStem: FilenameStem; noteId: NoteId; type: 'renameNoteFile' }
  | { name: string; parentPath?: FolderPath; type: 'createFolder' }
  | { folderPath: FolderPath; name: string; type: 'renameFolder' }
  | { folderPath: FolderPath; type: 'deleteFolder' }
  | { path: FolderPath; type: 'restoreFolder' }
  | { noteId: NoteId; type: 'toggleFavorite' }
  | { direction: MobileViewMoveDirection; noteId: NoteId; type: 'moveFavorite' }
  | { archived: boolean; noteId: NoteId; type: 'setArchived' }
  | { noteId: NoteId; organized: boolean; type: 'setOrganized' }
  | { mode: MobileNoteWidth; type: 'setDefaultNoteWidth' }
  | { definition: MobileViewDefinition; type: 'createView' }
  | { definition: MobileViewDefinition; viewId: string; type: 'updateView' }
  | { viewId: string; type: 'deleteView' }
  | { view: MobileSavedView; viewIndex?: number; type: 'restoreView' }
  | { direction: MobileViewMoveDirection; viewId: string; type: 'moveView' }
  | { allNotesFileVisibility?: MobileAllNotesFileVisibility; listPropertiesDisplay: string[]; target: 'allNotes' | 'inbox'; type: 'updatePrimaryNoteListProperties' }
  | { key: FrontmatterKey; mode: MobilePropertyDisplayMode | null; type: 'updatePropertyDisplayMode' }
  | { direction: MobileViewMoveDirection; type: 'moveTypeSection'; typeName: NoteTitle }
  | { type: 'createTypeDefinition'; typeName: NoteTitle }
  | { type: 'deleteTypeDefinition'; typeName: NoteTitle }
  | { nextTypeName: NoteTitle; type: 'renameTypeDefinition'; typeName: NoteTitle }
  | { definition: MobileTypeDefinition; type: 'restoreTypeDefinition'; typeName: NoteTitle }
  | { patch: MobileTypeDefinitionPatch; type: 'updateTypeDefinition'; typeName: NoteTitle }

export type MobileViewEdit = Extract<MobileWorkspaceEdit, { type: 'createView' | 'deleteView' | 'moveView' | 'updateView' }>

export type MobileTypeEdit = Extract<MobileWorkspaceEdit, { type: 'createTypeDefinition' | 'deleteTypeDefinition' | 'moveTypeSection' | 'renameTypeDefinition' | 'updateTypeDefinition' }>

export type MobileFolderEdit = Extract<MobileWorkspaceEdit, { type: 'createFolder' | 'deleteFolder' | 'renameFolder' }>

export type MobileFavoriteEdit = Extract<MobileWorkspaceEdit, { type: 'moveFavorite' }>

export type MobileVaultConfigEdit = Extract<MobileWorkspaceEdit, { type: 'setDefaultNoteWidth' | 'updatePrimaryNoteListProperties' | 'updatePropertyDisplayMode' }>

export type MobileRestorationEdit = Extract<MobileWorkspaceEdit, { type: 'restoreFolder' | 'restoreNote' | 'restoreTypeDefinition' | 'restoreView' }>

export type MobileSnapshotEdit = Extract<MobileWorkspaceEdit, { type: 'createRelationshipTarget' | 'deleteNote' | 'moveNoteToFolder' | 'renameNoteFile' }>

export type MobileNoteEdit = Exclude<MobileWorkspaceEdit, MobileFavoriteEdit | MobileFolderEdit | MobileRestorationEdit | MobileSnapshotEdit | MobileTypeEdit | MobileVaultConfigEdit | MobileViewEdit | { type: 'bulkEdit' | 'createNote' }>

export type MobileWorkspaceResultHandlerMap = {
  [Type in MobileWorkspaceEdit['type']]?: (
    snapshot: MobileWorkspaceSnapshot,
    edit: Extract<MobileWorkspaceEdit, { type: Type }>,
  ) => MobileWorkspaceEditResult
}

export type MobileWorkspaceWrite =
  | { content: MarkdownContent; kind: 'createNote'; path: string }
  | { kind: 'createFolder'; path: string }
  | { kind: 'deleteFolder'; path: string }
  | { kind: 'deleteNote'; path: string }
  | { kind: 'moveNote'; path: string; toPath: string }
  | { kind: 'renameFolder'; path: string; toPath: string }
  | { content: MarkdownContent; kind: 'saveNote'; path: string }
  | { content: MarkdownContent; kind: 'saveView'; path: string }
  | { config: MobileWorkspaceSnapshot['vaultConfig']; kind: 'saveVaultConfig' }
  | { kind: 'deleteView'; path: string }

export type MobileWorkspaceEditResult = {
  snapshot: MobileWorkspaceSnapshot
  writes: MobileWorkspaceWrite[]
}

export type MobileNoteEditContext = {
  editableNote: EditableNoteInput
  note: MobileNote
  notes: MobileNote[]
  typeDefinitions?: MobileTypeDefinitions
}

export type TitlePropertyUpdateEdit = Extract<MobileWorkspaceEdit, { type: 'updateProperty' }> & { value: string }

export type AddRelationshipInput = {
  key: FrontmatterKey
  note: EditableNoteInput
  notes: MobileNote[]
  targetRef?: WikilinkRef
  targetTitle: NoteTitle
}

export type MobileNoteEditHandler = (context: MobileNoteEditContext, edit: MobileNoteEdit) => MobileNote
