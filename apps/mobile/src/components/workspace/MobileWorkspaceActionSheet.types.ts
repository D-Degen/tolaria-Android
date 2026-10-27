import type { ReactNode } from 'react'
import type { MobileEditorBlock, MobileNote, MobileSidebarIcon, MobileTone, MobileTypeDefinitions, MobileViewFilterGroup } from '../../workspace/mobileWorkspaceModel'
import type { MobileTypeSchemaProperty, MobileTypeSchemaRelationship } from '../../workspace/mobileTypeDefinitionSchema'
import type { MobilePropertyValueKind } from '../../workspace/mobilePropertyValues'
import type { MobileTableOfContentsTarget } from '../../workspace/mobileTableOfContents'
import type { MobileWorkspaceSuggestionItem } from './MobileWorkspaceSuggestionListModel'

export type MobileWorkspaceAction =
  | 'addProperty'
  | 'addRelationship'
  | 'changeNoteType'
  | 'createFolder'
  | 'createType'
  | 'createView'
  | 'editFolder'
  | 'editFavorite'
  | 'editProperty'
  | 'editPrimaryListProperties'
  | 'editTypeSection'
  | 'editTypeVisibility'
  | 'editView'
  | 'findInNote'
  | 'moreActions'
  | 'moveNoteToFolder'
  | 'renameNoteFile'
  | 'replaceInNote'
  | 'search'
  | 'setNoteIcon'
  | 'tableOfContents'

export type MobileWorkspaceActionSheetProps = {
  action: MobileWorkspaceAction
  allNotesShowImages: boolean
  allNotesShowPdfs: boolean
  allNotesShowUnsupported: boolean
  canMoveFavoriteDown: boolean
  canMoveFavoriteUp: boolean
  canMoveTypeDown: boolean
  canMoveTypeUp: boolean
  canMoveViewDown: boolean
  canMoveViewUp: boolean
  canRedoWorkspaceEdit: boolean
  canUndoWorkspaceEdit: boolean
  canDeleteType: boolean
  createTitle: string
  editorBlocks: MobileEditorBlock[]
  editorBullets: string[]
  filenameStem: string
  folderPaths?: string[]
  folderName: string
  folderPath: string
  notes: MobileNote[]
  noteIcon: string
  noteType: string
  primaryDisplayProperties: string[]
  primaryItemId: string
  primaryPropertyOptions: string[]
  primaryPropertyQuery: string
  onChangeNoteType: () => void
  onChangeNoteTypeInputChange: (value: string) => void
  onClose: () => void
  onCopyFolderPath: () => void
  onCreateFolder: () => void
  onCreateNote: (titleOverride?: string) => void
  onCreateRelationshipTarget: () => void
  onCreateTitleChange: (value: string) => void
  onCopyDeepLink: () => void
  onCopyFilePath: () => void
  onCreateType: () => void
  onCreateView: () => void
  onDeleteFolder: () => void
  onDeleteNote: () => void
  onDeleteProperty: (noteId: string, key: string) => void
  onEnterNeighborhood: (noteId: string) => void
  onExportNoteAsPdf: () => void
  onDeleteType: () => void
  onDeleteView: () => void
  onFilenameStemChange: (value: string) => void
  onFolderNameChange: (value: string) => void
  onFolderPathChange: (value: string) => void
  onMoveFavoriteDown: () => void
  onMoveFavoriteUp: () => void
  onMoveNoteToFolder: () => void
  onMoveTypeDown: () => void
  onMoveTypeUp: () => void
  onMoveViewDown: () => void
  onMoveViewUp: () => void
  onNoteIconChange: (value: string) => void
  onOpenChangeNoteType: () => void
  onOpenCreateChildFolder: () => void
  onOpenCreateNoteInFolder: () => void
  onOpenFileInDefaultApp: () => void
  onOpenFindInNote: () => void
  onOpenMoveNoteToFolder: () => void
  onOpenReplaceInNote: () => void
  onOpenRenameNoteFile: () => void
  onOpenSetNoteIcon: () => void
  onOpenTableOfContents: () => void
  onSelectTableOfContentsTarget?: (target: MobileTableOfContentsTarget) => void
  onPrimaryAllNotesShowImagesChange: (value: boolean) => void
  onPrimaryAllNotesShowPdfsChange: (value: boolean) => void
  onPrimaryAllNotesShowUnsupportedChange: (value: boolean) => void
  onPrimaryDisplayPropertiesChange: (value: string[]) => void
  onPrimaryPropertyQueryChange: (value: string) => void
  onPropertyNameChange: (value: string) => void
  onPropertyValueChange: (value: string) => void
  onPropertyValueKindChange: (value: MobilePropertyValueKind) => void
  onRelationshipNameChange: (value: string) => void
  onRelationshipNoteSelect: (title: string, ref: string) => void
  onRelationshipNoteTitleChange: (value: string) => void
  onSaveProperty: () => void
  onSavePrimaryNoteListProperties: () => void
  onSaveRelationship: () => void
  onSaveTypeDefinition: () => void
  onRenameFolder: () => void
  onRevealFolder: () => void
  onRevealFile: () => void
  onRenameNoteFile: () => void
  onRenameNoteFileToTitle: () => void
  onRedoWorkspaceEdit: () => void
  onRemoveNoteIcon: () => void
  onSaveView: () => void
  onSearchQueryChange: (value: string) => void
  onSelectNote: (noteId: string) => void
  onSetArchived: (archived: boolean) => void
  onSetNoteIcon: () => void
  onSetOrganized: (organized: boolean) => void
  onToggleFavorite: () => void
  onToggleNoteWidth: () => void
  onToggleRawEditor?: () => void
  onToggleTypeVisibility: (typeName: string) => void
  onUndoWorkspaceEdit: () => void
  onUpdateNoteContent: (noteId: string, content: string) => void
  onViewIconChange: (value: MobileSidebarIcon) => void
  onViewDisplayPropertiesChange: (value: string[]) => void
  onViewFiltersChange: (value: MobileViewFilterGroup) => void
  onViewNameChange: (value: string) => void
  onViewPropertyQueryChange: (value: string) => void
  onViewSortChange: (value: string) => void
  onViewToneChange: (value: MobileTone) => void
  propertyName: string
  propertyValue: string
  propertyValueKind: MobilePropertyValueKind
  relationshipName: string
  relationshipNoteTitle: string
  searchQuery: string
  selectedNote: MobileNote | null
  typeDisplayProperties: string[]
  typeDefinitions?: MobileTypeDefinitions
  typeName: string
  typePropertyOptions: string[]
  typePropertyQuery: string
  typeSortPropertyOptions: string[]
  typeRelationshipTargetOptions: MobileWorkspaceSuggestionItem[]
  typeSchemaProperties: MobileTypeSchemaProperty[]
  typeSchemaPropertyName: string
  typeSchemaPropertyNameOptions: string[]
  typeSchemaPropertyValue: string
  typeSchemaRelationships: MobileTypeSchemaRelationship[]
  typeSchemaRelationshipName: string
  typeSchemaRelationshipNameOptions: string[]
  typeSchemaRelationshipTarget: string
  typeSectionLabel: string
  typeRenameName: string
  typeSort: string
  typeTemplate: string
  typeIcon: string
  typeTone: string
  typeVisible: boolean
  viewDisplayProperties: string[]
  viewFilters: MobileViewFilterGroup
  viewIcon: string
  viewName: string
  viewPropertyOptions: string[]
  viewPropertyQuery: string
  viewSortPropertyOptions: string[]
  viewSort: string
  viewTone: string | null
  onTypeDisplayPropertiesChange: (value: string[]) => void
  onTypeNameChange: (value: string) => void
  onTypePropertyQueryChange: (value: string) => void
  onTypeSchemaPropertyAdd: () => void
  onTypeSchemaPropertyNameChange: (value: string) => void
  onTypeSchemaPropertyRemove: (index: number) => void
  onTypeSchemaPropertyValueChange: (value: string) => void
  onTypeSchemaRelationshipAdd: () => void
  onTypeSchemaRelationshipNameChange: (value: string) => void
  onTypeSchemaRelationshipRemove: (index: number) => void
  onTypeSchemaRelationshipTargetSelect: (title: string, ref: string) => void
  onTypeSchemaRelationshipTargetChange: (value: string) => void
  onTypeSectionLabelChange: (value: string) => void
  onTypeRenameNameChange: (value: string) => void
  onTypeSortChange: (value: string) => void
  onTypeTemplateChange: (value: string) => void
  onTypeIconChange: (value: MobileSidebarIcon) => void
  onTypeToneChange: (value: MobileTone) => void
  onTypeVisibleChange: (value: boolean) => void
}

export type SingleTextFieldConfig = {
  allowEmptyInput?: boolean
  extraContent?: ReactNode
  inputLabel: string
  inputPlaceholder: string
  inputTestId: string
  inputValue: string
  onCancel: () => void
  onChangeText: (value: string) => void
  onSelect?: (value: string) => void
  onSubmit: () => void
  submitLabel: string
  secondaryAction?: ReactNode
  submitDisabled?: boolean
}

export type SuggestionInputActionConfig = {
  inputLabel: string
  inputPlaceholder: string
  inputTestId: string
  inputValue: string
  onCancel: () => void
  onChangeText: (value: string) => void
  onSelect?: (value: string) => void
  onSubmit: () => void
  submitLabel: string
  submitDisabled?: boolean
  suggestionTestId: string
  suggestionTestIdPrefix: string
  suggestions: string[]
}

export type RetargetNoteAction = 'changeType' | 'moveFolder'

export type ActionContentProps = MobileWorkspaceActionSheetProps & { compactForm: boolean }

export type WorkspaceFormProps = { form: ActionContentProps }
