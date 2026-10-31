import { MobileWorkspaceActionSheet } from '../components/workspace/MobileWorkspaceActionSheet'
import { MobileEditorActionRedirect } from '../components/workspace/MobileEditorActionRedirect'
import type { MobileEditorCommands } from '../workspace/mobileEditorCommands'
import type { MobileNote } from '../workspace/mobileWorkspaceModel'
import type { MobileTableOfContentsTarget } from '../workspace/mobileTableOfContents'
import type { TabletWorkspaceChromeProps } from './tabletWorkspaceTypes'

type ActionSheetHostProps = TabletWorkspaceChromeProps & {
  editorCommands?: MobileEditorCommands
  onSelectTableOfContentsTarget?: (target: MobileTableOfContentsTarget) => void
  suggestionNotes: MobileNote[]
}

export const WorkspaceActionSheetHost = (props: ActionSheetHostProps) => {
  const findAction = props.openAction === 'findInNote' || props.openAction === 'replaceInNote'
  const command = findAction ? props.editorCommands?.[props.openAction as 'findInNote' | 'replaceInNote'] : undefined
  if (command) return <MobileEditorActionRedirect command={command} onClose={props.onCloseAction} />
  return props.openAction ? (
    <MobileWorkspaceActionSheet
      action={props.openAction}
      {...actionSheetValues(props)}
      {...actionSheetHandlers(props)}
    />
  ) : null
}

function actionSheetValues(props: ActionSheetHostProps) {
  const {
    canRedoWorkspaceEdit,
    canUndoWorkspaceEdit,
    canMoveFavoriteDown,
    canMoveFavoriteUp,
    canMoveViewDown,
    canMoveViewUp,
    readOnlyForm,
    searchQuery,
    selectedNote,
    suggestionNotes,
    primaryPropertyOptions,
    typePropertyOptions,
    typeSchemaPropertyNameOptions,
    typeSchemaRelationshipNameOptions,
    typeRelationshipTargetOptions,
    typeSortPropertyOptions,
    viewPropertyOptions,
    viewSortPropertyOptions,
  } = props

  return {
    canDeleteType: props.canDeleteType,
    canMoveFavoriteDown,
    canMoveFavoriteUp,
    canMoveViewDown,
    canMoveViewUp,
    canRedoWorkspaceEdit,
    canUndoWorkspaceEdit,
    canMoveTypeDown: props.canMoveTypeDown,
    canMoveTypeUp: props.canMoveTypeUp,
    editorBlocks: props.editorBlocks,
    editorBullets: props.editorBullets,
    folderPaths: props.snapshot.folderPaths,
    notes: suggestionNotes,
    searchQuery,
    selectedNote,
    ...actionSheetFormValues(readOnlyForm),
    typeDefinitions: props.snapshot.typeDefinitions,
    primaryPropertyOptions,
    typePropertyOptions,
    typeSchemaPropertyNameOptions,
    typeSchemaRelationshipNameOptions,
    typeRelationshipTargetOptions,
    typeSortPropertyOptions,
    viewPropertyOptions,
    viewSortPropertyOptions,
  }
}

function actionSheetFormValues(readOnlyForm: ActionSheetHostProps['readOnlyForm']) {
  return {
    allNotesShowImages: readOnlyForm.allNotesShowImages,
    allNotesShowPdfs: readOnlyForm.allNotesShowPdfs,
    allNotesShowUnsupported: readOnlyForm.allNotesShowUnsupported,
    createTitle: readOnlyForm.createTitle,
    filenameStem: readOnlyForm.filenameStem,
    folderName: readOnlyForm.folderName,
    folderPath: readOnlyForm.folderPath,
    noteIcon: readOnlyForm.noteIcon,
    noteType: readOnlyForm.noteType,
    targetNoteId: readOnlyForm.targetNoteId,
    primaryDisplayProperties: readOnlyForm.primaryDisplayProperties,
    primaryItemId: readOnlyForm.primaryItemId,
    primaryPropertyQuery: readOnlyForm.primaryPropertyQuery,
    propertyName: readOnlyForm.propertyName,
    propertyValue: readOnlyForm.propertyValue,
    propertyValueKind: readOnlyForm.propertyValueKind,
    relationshipName: readOnlyForm.relationshipName,
    relationshipNoteTitle: readOnlyForm.relationshipNoteTitle,
    typeDisplayProperties: readOnlyForm.typeDisplayProperties,
    typeName: readOnlyForm.typeName,
    typePropertyQuery: readOnlyForm.typePropertyQuery,
    typeSchemaProperties: readOnlyForm.typeSchemaProperties,
    typeSchemaPropertyName: readOnlyForm.typeSchemaPropertyName,
    typeSchemaPropertyValue: readOnlyForm.typeSchemaPropertyValue,
    typeSchemaRelationships: readOnlyForm.typeSchemaRelationships,
    typeSchemaRelationshipName: readOnlyForm.typeSchemaRelationshipName,
    typeSchemaRelationshipTarget: readOnlyForm.typeSchemaRelationshipTarget,
    typeSectionLabel: readOnlyForm.typeSectionLabel,
    typeRenameName: readOnlyForm.typeRenameName,
    typeSort: readOnlyForm.typeSort,
    typeTemplate: readOnlyForm.typeTemplate,
    typeIcon: readOnlyForm.typeIcon,
    typeTone: readOnlyForm.typeTone,
    typeVisible: readOnlyForm.typeVisible,
    viewDisplayProperties: readOnlyForm.viewDisplayProperties,
    viewFilters: readOnlyForm.viewFilters,
    viewIcon: readOnlyForm.viewIcon,
    viewName: readOnlyForm.viewName,
    viewPropertyQuery: readOnlyForm.viewPropertyQuery,
    viewSort: readOnlyForm.viewSort,
    viewTone: readOnlyForm.viewTone,
  }
}

function actionSheetHandlers(props: ActionSheetHostProps) {
  return {
    ...actionSheetLifecycleHandlers(props),
    ...actionSheetNoteHandlers(props),
    ...actionSheetFileHandlers(props),
    ...actionSheetPropertyHandlers(props),
    ...actionSheetWorkspaceHandlers(props),
    ...actionSheetTypeHandlers(props),
    ...actionSheetViewHandlers(props),
  }
}

function actionSheetLifecycleHandlers(props: ActionSheetHostProps) {
  return {
    onClose: props.onCloseAction,
    onRedoWorkspaceEdit: props.onRedoWorkspaceEdit,
    onUndoWorkspaceEdit: props.onUndoWorkspaceEdit,
  }
}

function actionSheetNoteHandlers(props: ActionSheetHostProps) {
  return {
    onChangeNoteType: props.onChangeNoteType,
    onChangeNoteTypeInputChange: props.onChangeNoteTypeInputChange,
    onCopyDeepLink: props.onCopyDeepLink,
    onCopyFilePath: props.onCopyFilePath,
    onCreateNote: props.onCreateNote,
    onCreateSmartNote: props.onCreateSmartNote,
    onCreateTitleChange: props.onCreateTitleChange,
    onDeleteNote: props.onDeleteNote,
    onEditProperty: props.onEditProperty,
    onEnterNeighborhood: props.onEnterNeighborhood,
    onExportNoteAsPdf: props.onExportNoteAsPdf,
    onMoveFavoriteDown: props.onMoveFavoriteDown,
    onMoveFavoriteUp: props.onMoveFavoriteUp,
    onNoteIconChange: props.onNoteIconChange,
    onOpenChangeNoteType: props.onOpenChangeNoteType,
    onOpenFindInNote: props.onOpenFindInNote,
    onOpenReplaceInNote: props.onOpenReplaceInNote,
    onOpenSetNoteIcon: props.onOpenSetNoteIcon,
    onOpenSmartNotes: props.onOpenSmartNotes,
    onOpenTableOfContents: props.onOpenTableOfContents,
    onSelectTableOfContentsTarget: props.onSelectTableOfContentsTarget,
    onRemoveNoteIcon: props.onRemoveNoteIcon,
    onSearchQueryChange: props.onSearchQueryChange,
    onSelectNote: props.onSelectNote,
    onSetArchived: props.onSetArchived,
    onSetNoteIcon: props.onSetNoteIcon,
    onSetOrganized: props.onSetOrganized,
    onToggleFavorite: props.onToggleFavorite,
    onToggleNoteWidth: props.onToggleNoteWidth,
    onToggleRawEditor: props.editorCommands?.toggleRawEditor,
    onUpdateNoteContent: props.onUpdateNoteContent,
    onUpdateNoteTitle: props.onUpdateNoteTitle,
  }
}

function actionSheetFileHandlers(props: ActionSheetHostProps) {
  return {
    onCopyFolderPath: props.onCopyFolderPath,
    onCreateFolder: props.onCreateFolder,
    onDeleteFolder: props.onDeleteFolder,
    onFilenameStemChange: props.onFilenameStemChange,
    onFolderNameChange: props.onFolderNameChange,
    onFolderPathChange: props.onFolderPathChange,
    onMoveNoteToFolder: props.onMoveNoteToFolder,
    onOpenCreateChildFolder: props.onOpenCreateChildFolder,
    onOpenCreateNoteInFolder: props.onOpenCreateNoteInFolder,
    onOpenFileInDefaultApp: props.onOpenFileInDefaultApp,
    onOpenMoveNoteToFolder: props.onOpenMoveNoteToFolder,
    onOpenRenameNoteFile: props.onOpenRenameNoteFile,
    onRevealFile: props.onRevealFile,
    onRenameFolder: props.onRenameFolder,
    onRevealFolder: props.onRevealFolder,
    onRenameNoteFile: props.onRenameNoteFile,
    onRenameNoteFileToTitle: props.onRenameNoteFileToTitle,
  }
}

function actionSheetPropertyHandlers(props: ActionSheetHostProps) {
  return {
    onCreateRelationshipTarget: props.onCreateRelationshipTarget,
    onDeleteProperty: props.onDeleteProperty,
    onPropertyNameChange: props.onPropertyNameChange,
    onPropertyValueChange: props.onPropertyValueChange,
    onPropertyValueKindChange: props.onPropertyValueKindChange,
    onRelationshipNameChange: props.onRelationshipNameChange,
    onRelationshipNoteSelect: props.onRelationshipNoteSelect,
    onRelationshipNoteTitleChange: props.onRelationshipNoteTitleChange,
    onSaveProperty: props.onSaveProperty,
    onSaveRelationship: props.onSaveRelationship,
  }
}

function actionSheetWorkspaceHandlers(props: ActionSheetHostProps) {
  return {
    onPrimaryAllNotesShowImagesChange: props.onPrimaryAllNotesShowImagesChange,
    onPrimaryAllNotesShowPdfsChange: props.onPrimaryAllNotesShowPdfsChange,
    onPrimaryAllNotesShowUnsupportedChange: props.onPrimaryAllNotesShowUnsupportedChange,
    onPrimaryDisplayPropertiesChange: props.onPrimaryDisplayPropertiesChange,
    onPrimaryPropertyQueryChange: props.onPrimaryPropertyQueryChange,
    onSavePrimaryNoteListProperties: props.onSavePrimaryNoteListProperties,
  }
}

function actionSheetTypeHandlers(props: ActionSheetHostProps) {
  return {
    onCreateType: props.onCreateType,
    onDeleteType: props.onDeleteType,
    onMoveTypeDown: props.onMoveTypeDown,
    onMoveTypeUp: props.onMoveTypeUp,
    onSaveTypeDefinition: props.onSaveTypeDefinition,
    onToggleTypeVisibility: props.onToggleTypeVisibility,
    onTypeDisplayPropertiesChange: props.onTypeDisplayPropertiesChange,
    onTypeNameChange: props.onTypeNameChange,
    onTypePropertyQueryChange: props.onTypePropertyQueryChange,
    onTypeSchemaPropertyAdd: props.onTypeSchemaPropertyAdd,
    onTypeSchemaPropertyNameChange: props.onTypeSchemaPropertyNameChange,
    onTypeSchemaPropertyRemove: props.onTypeSchemaPropertyRemove,
    onTypeSchemaPropertyValueChange: props.onTypeSchemaPropertyValueChange,
    onTypeSchemaRelationshipAdd: props.onTypeSchemaRelationshipAdd,
    onTypeSchemaRelationshipNameChange: props.onTypeSchemaRelationshipNameChange,
    onTypeSchemaRelationshipRemove: props.onTypeSchemaRelationshipRemove,
    onTypeSchemaRelationshipTargetSelect: props.onTypeSchemaRelationshipTargetSelect,
    onTypeSchemaRelationshipTargetChange: props.onTypeSchemaRelationshipTargetChange,
    onTypeRenameNameChange: props.onTypeRenameNameChange,
    onTypeSectionLabelChange: props.onTypeSectionLabelChange,
    onTypeSortChange: props.onTypeSortChange,
    onTypeTemplateChange: props.onTypeTemplateChange,
    onTypeIconChange: props.onTypeIconChange,
    onTypeToneChange: props.onTypeToneChange,
    onTypeVisibleChange: props.onTypeVisibleChange,
  }
}

function actionSheetViewHandlers(props: ActionSheetHostProps) {
  return {
    onCreateView: props.onCreateView,
    onDeleteView: props.onDeleteView,
    onMoveViewDown: props.onMoveViewDown,
    onMoveViewUp: props.onMoveViewUp,
    onSaveView: props.onSaveView,
    onViewIconChange: props.onViewIconChange,
    onViewDisplayPropertiesChange: props.onViewDisplayPropertiesChange,
    onViewFiltersChange: props.onViewFiltersChange,
    onViewNameChange: props.onViewNameChange,
    onViewPropertyQueryChange: props.onViewPropertyQueryChange,
    onViewSortChange: props.onViewSortChange,
    onViewToneChange: props.onViewToneChange,
  }
}
