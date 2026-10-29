import type { MobileSidebarFolderSelection, MobileSidebarItemSelection } from '../components/workspace/MobileWorkspaceSidebar'
import type { MobileNote, MobilePropertyValue, MobileSavedView, MobileViewFilterGroup, MobileViewFilterNode, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import { evaluateMobileSavedView } from '../workspace/mobileSavedViews'
import { mobileDefaultListPropertyDisplay } from '../workspace/mobileWorkspaceSuggestions'
import { mobileTypeNameFromSidebarLabel } from '../workspace/mobileTypeNames'
import { openFavoriteActions } from './tabletWorkspaceFavoriteActions'
import { createFolderFields, folderActionFields, folderParentPathForSelection } from './tabletWorkspaceFolderActions'
import { openPrimaryListProperties } from './tabletWorkspacePrimaryNoteListActions'
import { typeDefinitionFields } from './tabletWorkspaceTypeDefinitionFields'
import { addPropertyFields, editPropertyFields } from './tabletWorkspacePropertyActions'
import { createViewInitialFilters } from './tabletWorkspaceViewHelpers'
import type { TabletWorkspaceNavigation, SetOpenAction, ReadOnlyFormUpdater } from './tabletWorkspaceController.types'
import { workspaceActionOpener, addRelationshipFields, openWorkspaceAction, workspaceNotes } from './tabletWorkspaceActionForms'

export function actionSheetWorkspaceActions({
  closeAction,
  navigation,
  onCreateNoteDirect,
  selectedNote,
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: {
  closeAction: () => void
  navigation: TabletWorkspaceNavigation
  onCreateNoteDirect: (titleOverride?: string) => void
  selectedNote: MobileNote | null
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  const openAction = workspaceActionOpener({ setOpenAction, updateReadOnlyForm })

  return {
    onCloseAction: closeAction,
    onOpenEditProperty: (key: string, value: MobilePropertyValue) => {
      openAction('editProperty', editPropertyFields(key, value, workspaceSnapshot.vaultConfig?.propertyDisplayModes))
    },
    ...coreWorkspaceActionOpeners({ navigation, onCreateNoteDirect, openAction, setOpenAction, updateReadOnlyForm, workspaceSnapshot }),
    ...noteWorkspaceActionOpeners({ openAction, selectedNote, setOpenAction }),
    ...sidebarWorkspaceActionOpeners({ setOpenAction, updateReadOnlyForm, workspaceSnapshot }),
  }
}

export function coreWorkspaceActionOpeners({
  navigation,
  onCreateNoteDirect,
  openAction,
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: {
  navigation: TabletWorkspaceNavigation
  onCreateNoteDirect: (titleOverride?: string) => void
  openAction: ReturnType<typeof workspaceActionOpener>
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  return {
    onAddProperty: (key?: string) => openAction('addProperty', addPropertyFields(key, workspaceSnapshot.vaultConfig?.propertyDisplayModes)),
    onAddRelationship: (key?: string) => openAction('addRelationship', addRelationshipFields(key)),
    onOpenCreateFolder: () => openWorkspaceAction({
      action: 'createFolder',
      fields: createFolderFields(folderParentPathForSelection(navigation.sidebarSelection)),
      setOpenAction,
      updateReadOnlyForm,
    }),
    onOpenCreateNote: () => onCreateNoteDirect(''),
    onOpenSmartCreateNote: () => setOpenAction('smartCreateNote'),
    onOpenCreateType: () => openAction('createType', [{ key: 'typeName', value: '' }]),
    onOpenCreateTypeWithName: (typeName: string) => openAction('createType', [{ key: 'typeName', value: typeName }]),
    onOpenCreateView: () => openCreateView({ setOpenAction, updateReadOnlyForm }),
    onOpenSearch: () => setOpenAction('search'),
  }
}

export function noteWorkspaceActionOpeners({
  openAction,
  selectedNote,
  setOpenAction,
}: {
  openAction: ReturnType<typeof workspaceActionOpener>
  selectedNote: MobileNote | null
  setOpenAction: SetOpenAction
}) {
  return {
    onOpenChangeNoteType: () => openAction('changeNoteType', [{ key: 'noteType', value: selectedNote?.type ?? '' }]),
    onOpenFindInNote: () => setOpenAction('findInNote'),
    onOpenMoreActions: () => setOpenAction('moreActions'),
    onOpenMoveNoteToFolder: () => openAction('moveNoteToFolder', [{ key: 'folderPath', value: '' }]),
    onOpenRenameNoteFile: () => openAction('renameNoteFile', [
      { key: 'filenameStem', value: filenameStemForNote(selectedNote) },
    ]),
    onOpenReplaceInNote: () => setOpenAction('replaceInNote'),
    onOpenSetNoteIcon: () => openAction('setNoteIcon', [
      { key: 'noteIcon', value: selectedNote?.icon ?? '' },
    ]),
    onOpenSmartNotes: () => setOpenAction('smartNotes'),
    onOpenTableOfContents: () => setOpenAction('tableOfContents'),
  }
}

export function sidebarWorkspaceActionOpeners({
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: {
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  return {
    onOpenFolderActions: (selection: MobileSidebarFolderSelection) => openWorkspaceAction({
      action: 'editFolder',
      fields: folderActionFields(selection),
      setOpenAction,
      updateReadOnlyForm,
    }),
    onOpenFavoriteActions: (selection: MobileSidebarItemSelection) => openFavoriteActions({
      selection,
      setOpenAction,
      snapshot: workspaceSnapshot,
      updateReadOnlyForm,
    }),
    onOpenPrimaryActions: (selection: MobileSidebarItemSelection) => openPrimaryListProperties({
      selection,
      setOpenAction,
      snapshot: workspaceSnapshot,
      updateReadOnlyForm,
    }),
    onOpenViewActions: (selection: MobileSidebarItemSelection) => openViewActions({
      selection,
      setOpenAction,
      snapshot: workspaceSnapshot,
      updateReadOnlyForm,
    }),
    onOpenTypeActions: (selection: MobileSidebarItemSelection) => openTypeActions({
      selection,
      setOpenAction,
      snapshot: workspaceSnapshot,
      updateReadOnlyForm,
    }),
    onOpenTypeVisibility: () => setOpenAction('editTypeVisibility'),
  }
}

export function filenameStemForNote(note: MobileNote | null): string {
  const path = note?.path ?? note?.id ?? ''
  const filename = path.split('/').filter(Boolean).at(-1) ?? path
  return filename.replace(/\.md$/u, '')
}

export function openCreateView({
  setOpenAction,
  updateReadOnlyForm,
}: {
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  updateReadOnlyForm('viewDisplayProperties', [])
  updateReadOnlyForm('viewFilters', createViewInitialFilters())
  updateReadOnlyForm('viewIcon', '')
  updateReadOnlyForm('viewName', '')
  updateReadOnlyForm('viewPropertyQuery', '')
  updateReadOnlyForm('viewSort', '')
  updateReadOnlyForm('viewTone', null)
  setOpenAction('createView')
}

export function openViewActions({
  selection,
  setOpenAction,
  snapshot,
  updateReadOnlyForm,
}: {
  selection: MobileSidebarItemSelection
  setOpenAction: SetOpenAction
  snapshot: MobileWorkspaceSnapshot
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  if (selection.sectionId !== 'views') return
  const views = snapshot.views ?? []
  const view = views.find((candidate) => candidate.id === (selection.viewId ?? selection.id))
  if (!view) return
  const presentation = viewActionPresentation(view)
  updateReadOnlyForm('editingViewId', selection.viewId ?? selection.id)
  updateReadOnlyForm('viewDisplayProperties', viewDisplayPropertiesForEdit(view, snapshot))
  updateReadOnlyForm('viewFilters', cloneFilterGroup(view.definition.filters))
  updateReadOnlyForm('viewIcon', presentation.icon)
  updateReadOnlyForm('viewName', selection.label)
  updateReadOnlyForm('viewPropertyQuery', '')
  updateReadOnlyForm('viewSort', presentation.sort)
  updateReadOnlyForm('viewTone', presentation.tone)
  setOpenAction('editView')
}

function viewActionPresentation(view: MobileSavedView) {
  return {
    icon: view.definition.icon ?? '',
    sort: view.definition.sort ?? '',
    tone: view.definition.color ?? null,
  }
}

export function openTypeActions({
  selection,
  setOpenAction,
  snapshot,
  updateReadOnlyForm,
}: {
  selection: MobileSidebarItemSelection
  setOpenAction: SetOpenAction
  snapshot: MobileWorkspaceSnapshot
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  if (selection.sectionId !== 'types') return
  const typeName = typeNameForSidebarSelection(snapshot, selection)
  if (!typeName) return

  openWorkspaceAction({
    action: 'editTypeSection',
    fields: typeDefinitionFields({
      definition: snapshot.typeDefinitions?.[typeName],
      label: selection.label,
      typeName,
    }),
    setOpenAction,
    updateReadOnlyForm,
  })
}

export function viewDisplayPropertiesForEdit(
  view: MobileSavedView,
  snapshot: MobileWorkspaceSnapshot,
): string[] {
  const displayProperties = view.definition.listPropertiesDisplay ?? []
  if (displayProperties.length > 0) return [...displayProperties]

  return mobileDefaultListPropertyDisplay(
    evaluateMobileSavedView(view, workspaceNotes(snapshot)),
    snapshot.typeDefinitions,
  )
}

export function typeNameForSidebarSelection(
  snapshot: MobileWorkspaceSnapshot,
  selection: MobileSidebarItemSelection,
): string | null {
  const sidebarTypeName = snapshot.sidebarSections
    .find((section) => section.id === 'types')
    ?.items
    ?.find((item) => item.id === selection.id)
    ?.typeName

  return mobileTypeNameFromSidebarLabel(selection.label, selection.typeName ?? sidebarTypeName)
}

export function cloneFilterGroup(group: MobileViewFilterGroup): MobileViewFilterGroup {
  if ('any' in group) return { any: group.any.map(cloneFilterNode) }
  return { all: group.all.map(cloneFilterNode) }
}

export function cloneFilterNode(node: MobileViewFilterNode): MobileViewFilterNode {
  if ('all' in node || 'any' in node) return cloneFilterGroup(node)
  return {
    ...node,
    value: Array.isArray(node.value) ? [...node.value] : node.value,
  }
}
