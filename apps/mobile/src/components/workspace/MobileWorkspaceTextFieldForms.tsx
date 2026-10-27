import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import { ScrollView, View } from 'react-native'
import { mobileText } from '../../i18n/mobileText'
import { MobileButton } from '../../ui/MobileButton'
import { MobileToolbar, MobileToolbarSpacer, MobileToolbarTitle } from '../../ui/MobilePanel'
import { MobileTextInput } from '../../ui/MobileTextInput'
import { useMobileDeviceLayout } from '../../ui/useMobileDeviceLayout'
import { validateMobileMoveNoteFolderPath, validateMobileRenameNoteFilePath, type MobileNotePathValidationStatus } from '../../workspace/mobileNotePaths'
import { mobileFolderSuggestions, mobileTypeSuggestions } from '../../workspace/mobileWorkspaceSuggestions'
import { MobileMetadataPicker } from './MobileMetadataPicker'
import { MobileSortPicker } from './MobileSortPicker'
import { MobileViewDisplayPropertiesPicker } from './MobileViewDisplayPropertiesPicker'
import { MobileViewFilterBuilder } from './MobileViewFilterBuilder'
import { MobileSavedViewActions } from './MobileWorkspaceMoveActions'
import { MobileWorkspaceSuggestionList } from './MobileWorkspaceSuggestionList'
import { createMobileWorkspaceSheetStyles as createThemeStyles } from './mobileWorkspaceActionSheetStyles'
import { mobileSingleTextFieldSubmitDisabled, mobileWorkspaceFormSheetAutoFocus, mobileWorkspaceFormSheetMaxSuggestions } from './MobileWorkspaceActionSheetModel'
import type { ActionContentProps, SingleTextFieldConfig, MobileWorkspaceActionSheetProps, RetargetNoteAction, SuggestionInputActionConfig } from './MobileWorkspaceActionSheet.types'
import { actionTitle, phoneSheetStyles } from './mobileWorkspaceSheetPresentation'
import { SheetFooter } from './MobileWorkspaceSheetChrome'

export function ViewFormContent(props: ActionContentProps) {
  return <SingleTextFieldContent
    compactTitle={props.compactForm ? actionTitle(props.action, props.propertyName) : undefined}
    config={singleTextFieldConfig(props)}
  />
}

function SingleTextFieldContent({ config, compactTitle }: { config: SingleTextFieldConfig; compactTitle?: string }) {
  const { styles } = useMobileStyles(createThemeStyles)
  const secondaryInContent = useMobileDeviceLayout() === 'phone'
  return (
    <View style={[styles.formBody, compactTitle && phoneSheetStyles.compactBody]}>
      <SingleTextFieldHeader config={config} title={compactTitle} />
      <ScrollView contentContainerStyle={[styles.content, compactTitle && phoneSheetStyles.compactContent]} keyboardShouldPersistTaps="handled" style={styles.scrollArea} testID="workspace-single-field-scroll">
        <MobileTextInput
          autoFocus={mobileWorkspaceFormSheetAutoFocus}
          label={config.inputLabel}
          placeholder={config.inputPlaceholder}
          testID={config.inputTestId}
          value={config.inputValue}
          onChangeText={config.onChangeText}
        />
        {config.extraContent}
        {secondaryInContent ? config.secondaryAction : null}
      </ScrollView>
      {!compactTitle ? <SheetFooter pinned><SingleTextFieldActions config={config} primaryOnly={secondaryInContent} /></SheetFooter> : null}
    </View>
  )
}

function SingleTextFieldHeader({ config, title }: { config: SingleTextFieldConfig; title?: string }) {
  if (!title) return null
  return (
    <MobileToolbar testID="workspace-action-sheet-toolbar">
      <MobileToolbarTitle title={title} />
      <MobileToolbarSpacer />
      <SingleTextFieldActions config={config} primaryOnly />
    </MobileToolbar>
  )
}

function SingleTextFieldActions({ config, primaryOnly = false }: { config: SingleTextFieldConfig; primaryOnly?: boolean }) {
  return <>
    {!primaryOnly ? config.secondaryAction : null}
    <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={config.onCancel} />
    <MobileButton
      disabled={mobileSingleTextFieldSubmitDisabled(config)}
      label={config.submitLabel}
      variant="primary"
      onPress={config.onSubmit}
    />
  </>
}

function singleTextFieldConfig(props: MobileWorkspaceActionSheetProps) {
  const simpleConfig = simpleTextFieldConfig(props)
  if (simpleConfig) return simpleConfig

  const viewConfig = viewTextFieldConfig(props)
  if (viewConfig) return viewConfig

  throw new Error(`Unsupported single-text action: ${props.action}`)
}

function simpleTextFieldConfig(props: MobileWorkspaceActionSheetProps): SingleTextFieldConfig | null {
  if (props.action === 'createFolder') {
    return {
      inputLabel: mobileText('sidebar.folder.name'),
      inputPlaceholder: mobileText('sidebar.folder.name'),
      inputTestId: 'workspace-create-folder-name-input',
      inputValue: props.folderName,
      onCancel: props.onClose,
      onChangeText: props.onFolderNameChange,
      onSubmit: props.onCreateFolder,
      submitLabel: mobileText('common.create'),
    }
  }

  if (props.action === 'createType') {
    return {
      inputLabel: mobileText('sidebar.action.createType'),
      inputPlaceholder: mobileText('sidebar.action.createType'),
      inputTestId: 'workspace-create-type-name-input',
      inputValue: props.typeName,
      onCancel: props.onClose,
      onChangeText: props.onTypeNameChange,
      onSubmit: props.onCreateType,
      submitLabel: mobileText('common.create'),
    }
  }

  return noteTextFieldConfig(props)
}

function noteTextFieldConfig(props: MobileWorkspaceActionSheetProps): SingleTextFieldConfig | null {
  if (props.action === 'renameNoteFile') {
    return {
      inputLabel: mobileText('editor.filename.rename'),
      inputPlaceholder: mobileText('editor.filename.rename'),
      inputTestId: 'workspace-rename-file-input',
      inputValue: props.filenameStem,
      onCancel: props.onClose,
      onChangeText: props.onFilenameStemChange,
      onSubmit: props.onRenameNoteFile,
      submitDisabled: notePathValidationBlocksSubmit(renameNoteFileValidation(props)),
      submitLabel: mobileText('common.save'),
    }
  }

  if (props.action === 'setNoteIcon') {
    return {
      inputLabel: mobileText('command.note.setIcon'),
      inputPlaceholder: mobileText('command.note.setIcon'),
      inputTestId: 'workspace-note-icon-input',
      inputValue: props.noteIcon,
      onCancel: props.onClose,
      onChangeText: props.onNoteIconChange,
      onSubmit: props.onSetNoteIcon,
      secondaryAction: props.selectedNote?.icon ? (
        <MobileButton label={mobileText('command.note.removeIcon')} variant="ghost" onPress={props.onRemoveNoteIcon} />
      ) : undefined,
      submitLabel: mobileText('common.save'),
    }
  }

  return null
}

function viewTextFieldConfig(props: MobileWorkspaceActionSheetProps): SingleTextFieldConfig | null {
  if (props.action === 'editView') {
    return {
      extraContent: editViewContent(props),
      inputLabel: mobileText('viewDialog.nameLabel'),
      inputPlaceholder: mobileText('viewDialog.namePlaceholder'),
      inputTestId: 'workspace-edit-view-name-input',
      inputValue: props.viewName,
      onCancel: props.onClose,
      onChangeText: props.onViewNameChange,
      onSubmit: props.onSaveView,
      secondaryAction: (
        <MobileSavedViewActions
          canMoveDown={props.canMoveViewDown}
          canMoveUp={props.canMoveViewUp}
          onDelete={props.onDeleteView}
          onMoveDown={props.onMoveViewDown}
          onMoveUp={props.onMoveViewUp}
        />
      ),
      submitLabel: mobileText('common.save'),
    }
  }

  if (props.action === 'createView') {
    return {
      extraContent: editViewContent(props),
      inputLabel: mobileText('viewDialog.nameLabel'),
      inputPlaceholder: mobileText('viewDialog.namePlaceholder'),
      inputTestId: 'workspace-create-view-name-input',
      inputValue: props.viewName,
      onCancel: props.onClose,
      onChangeText: props.onViewNameChange,
      onSubmit: props.onCreateView,
      submitLabel: mobileText('common.create'),
    }
  }

  return null
}

function viewFilterBuilder(props: MobileWorkspaceActionSheetProps) {
  return (
    <>
      <MobileMetadataPicker
        selectedIcon={props.viewIcon}
        selectedTone={props.viewTone}
        testIDPrefix="workspace-view"
        onIconSelect={props.onViewIconChange}
        onToneSelect={props.onViewToneChange}
      />
      <MobileSortPicker
        customPropertyOptions={props.viewSortPropertyOptions}
        selectedSort={props.viewSort}
        testID="workspace-view-sort-picker"
        testIDPrefix="workspace-view-sort"
        onSelect={props.onViewSortChange}
      />
      <MobileViewFilterBuilder
        group={props.viewFilters}
        notes={props.notes}
        typeDefinitions={props.typeDefinitions}
        onChange={props.onViewFiltersChange}
      />
    </>
  )
}

function editViewContent(props: MobileWorkspaceActionSheetProps) {
  return (
    <>
      {viewFilterBuilder(props)}
      <ViewDisplayPropertiesPicker {...props} />
    </>
  )
}

function ViewDisplayPropertiesPicker({
  onViewDisplayPropertiesChange,
  onViewPropertyQueryChange,
  viewDisplayProperties,
  viewPropertyOptions,
  viewPropertyQuery,
}: MobileWorkspaceActionSheetProps) {
  return (
    <MobileViewDisplayPropertiesPicker
      options={viewPropertyOptions}
      query={viewPropertyQuery}
      selectedProperties={viewDisplayProperties}
      onQueryChange={onViewPropertyQueryChange}
      onSelectedPropertiesChange={onViewDisplayPropertiesChange}
    />
  )
}

export function RetargetNoteContent(props: MobileWorkspaceActionSheetProps & { retargetAction: RetargetNoteAction }) {
  return (
    <SuggestionInputActionContent config={retargetNoteInputConfig(props)} />
  )
}

function retargetNoteInputConfig(props: MobileWorkspaceActionSheetProps & { retargetAction: RetargetNoteAction }): SuggestionInputActionConfig {
  if (props.retargetAction === 'changeType') {
    return {
      inputLabel: mobileText('command.note.changeType'),
      inputPlaceholder: mobileText('inspector.properties.searchTypes'),
      inputTestId: 'workspace-change-type-input',
      inputValue: props.noteType,
      onCancel: props.onClose,
      onChangeText: props.onChangeNoteTypeInputChange,
      onSelect: (value: string) => {
        props.onChangeNoteTypeInputChange(value)
        props.onChangeNoteType()
      },
      onSubmit: props.onChangeNoteType,
      submitLabel: mobileText('common.save'),
      suggestionTestId: 'workspace-change-type-suggestions',
      suggestionTestIdPrefix: 'workspace-change-type-suggestion',
      suggestions: mobileTypeSuggestions(props.notes, props.selectedNote, props.noteType, props.typeDefinitions),
    }
  }

  return {
    inputLabel: mobileText('command.note.moveToFolder'),
    inputPlaceholder: mobileText('sidebar.folder.name'),
    inputTestId: 'workspace-move-folder-input',
    inputValue: props.folderPath,
    onCancel: props.onClose,
    onChangeText: props.onFolderPathChange,
    onSubmit: props.onMoveNoteToFolder,
    submitLabel: mobileText('common.save'),
    submitDisabled: notePathValidationBlocksSubmit(moveNoteToFolderValidation(props)),
    suggestionTestId: 'workspace-move-folder-suggestions',
    suggestionTestIdPrefix: 'workspace-move-folder-suggestion',
    suggestions: mobileFolderSuggestions(props.notes, props.selectedNote, props.folderPath, props.folderPaths),
  }
}

function SuggestionInputActionContent({ config }: { config: SuggestionInputActionConfig }) {
  const { styles } = useMobileStyles(createThemeStyles)
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
      <MobileTextInput
        autoFocus={mobileWorkspaceFormSheetAutoFocus}
        label={config.inputLabel}
        placeholder={config.inputPlaceholder}
        testID={config.inputTestId}
        value={config.inputValue}
        onChangeText={config.onChangeText}
      />
      <MobileWorkspaceSuggestionList
        labels={config.suggestions}
        maxVisibleItems={mobileWorkspaceFormSheetMaxSuggestions}
        testID={config.suggestionTestId}
        testIDPrefix={config.suggestionTestIdPrefix}
        onSelect={config.onSelect ?? config.onChangeText}
      />
      <SheetFooter>
        <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={config.onCancel} />
        <MobileButton disabled={config.submitDisabled || config.inputValue.trim().length === 0} label={config.submitLabel} variant="primary" onPress={config.onSubmit} />
      </SheetFooter>
    </ScrollView>
  )
}

function renameNoteFileValidation(props: MobileWorkspaceActionSheetProps): MobileNotePathValidationStatus {
  return validateMobileRenameNoteFilePath({
    filenameStem: props.filenameStem,
    note: props.selectedNote,
    notes: props.notes,
  })
}

function moveNoteToFolderValidation(props: MobileWorkspaceActionSheetProps): MobileNotePathValidationStatus {
  return validateMobileMoveNoteFolderPath({
    folderPath: props.folderPath,
    folderPaths: props.folderPaths,
    note: props.selectedNote,
    notes: props.notes,
  })
}

function notePathValidationBlocksSubmit(status: MobileNotePathValidationStatus) {
  return status !== 'ok'
}

export function WorkspaceSingleTextFieldContent(props: MobileWorkspaceActionSheetProps) {
  return <SingleTextFieldContent config={singleTextFieldConfig(props)} />
}
