import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { useMobileSearchEvent } from '../analytics/useMobileDiscoveryEvents'
import { consumeIncomingSharedText } from '../workspace/smartNotes/smartNotesEngine'
import type { MobileWorkspaceAction } from '../components/workspace/MobileWorkspaceActionSheet'
import type { MobileSidebarItemSelection } from '../components/workspace/MobileWorkspaceSidebar'
import type { MobileNote, MobilePropertyValue, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import type { MobileWorkspaceEdit } from '../workspace/mobileWorkspaceEditing'
import type { ReadOnlyWorkspaceRepository, ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'
import { mobileNoteWithResolvedWidth } from '../workspace/mobileNoteWidth'
import { mobileDefaultNoteWidthFromVaultConfig } from '../workspace/mobileVaultConfig'
import { useTabletWorkspaceNavigation } from './tabletWorkspaceNavigation'
import type { MobileActionSheetQaTarget, TabletReadOnlyForm } from './tabletWorkspaceTypes'
import { editorWorkspaceActions } from './tabletWorkspaceEditorActions'
import { selectAfterWorkspaceEdit } from './tabletWorkspaceEditSelection'
import { useWorkspaceEditPipeline } from './tabletWorkspacePersistence'
import { useMobileNoteRead } from './useMobileNoteRead'
import { selectedFolderCommandActions } from './tabletWorkspaceSelectedFolderActions'
import { createWorkspaceActions, selectedViewCommandActions } from './tabletWorkspaceViewActions'
import { propertyWorkspaceActions, relationshipWorkspaceActions, retargetWorkspaceActions, noteIconWorkspaceActions } from './tabletWorkspaceFieldActions'
import { actionSheetWorkspaceActions } from './tabletWorkspaceActionOpeners'
import type { TabletWorkspaceNavigation, SetOpenAction, ApplyWorkspaceEdit, WorkspaceActionsContext, SaveSelectedEdit } from './tabletWorkspaceController.types'
import { emptyReadOnlyForm } from './tabletWorkspaceActionForms'

type TabletWorkspaceControllerRequest = {
  repository: ReadOnlyWorkspaceRepository
  repositoryRequest?: ReadOnlyWorkspaceRequest
  snapshot: MobileWorkspaceSnapshot
}

export function useTabletWorkspaceController(request: TabletWorkspaceControllerRequest) {
  const { repository, repositoryRequest } = request
  const pipeline = useWorkspaceEditPipeline(request)
  const { applyWorkspaceEdit, workspaceSnapshot } = pipeline
  const [openAction, setOpenAction] = useState<MobileWorkspaceAction | null>(null)
  useMobileSearchEvent(openAction === 'search')
  useEffect(() => {
    const checkSharedIntent = () => {
      void consumeIncomingSharedText().then((shared) => {
        if (shared) setOpenAction('smartCreateNote')
      })
    }
    checkSharedIntent()
    const subscription = AppState.addEventListener?.('change', (state) => {
      if (state === 'active') checkSharedIntent()
    })
    return () => {
      subscription?.remove()
    }
  }, [])
  const { readOnlyForm, resetForm, updateReadOnlyForm } = useReadOnlyFormState()
  const [searchQuery, setSearchQuery] = useState('')
  const navigation = useTabletWorkspaceNavigation(workspaceSnapshot, searchQuery)
  const { defaultNoteWidth, selectedNote } = resolvedControllerNote(workspaceSnapshot, navigation.selectedNote)
  const applyEdit = useControllerApplyEdit({ applyWorkspaceEdit, navigation, setSelectedNoteId: navigation.setSelectedNoteId })
  const closeAction = useCloseWorkspaceAction({ resetForm, setOpenAction })
  const saveSelectedEdit = useSaveSelectedEdit({ applyEdit, closeAction, readOnlyForm, selectedNote })
  const onOpenChangeNoteTypeForNote = useCallback((note: MobileNote) => {
    navigation.setSelectedNoteId(note.id)
    updateReadOnlyForm('noteType', note.type ?? '')
    updateReadOnlyForm('targetNoteId', note.id)
    setOpenAction('changeNoteType')
  }, [navigation, setOpenAction, updateReadOnlyForm])
  const workspaceActionsContext = {
    applyEdit,
    closeAction,
    navigation,
    openAction,
    readOnlyForm,
    repositoryRequest,
    selectedNote,
    setOpenAction,
    updateReadOnlyForm,
    workspaceSnapshot,
  }
  const createActions = createWorkspaceActions(workspaceActionsContext)
  const fieldActions = controllerFieldActions(workspaceActionsContext, saveSelectedEdit)
  const { editorActions, selectedFolderActions, selectedViewActions } = controllerSelectedActions(workspaceActionsContext)
  const actionSheetActions = actionSheetWorkspaceActions({
    ...workspaceActionsContext,
    onCreateNoteDirect: createActions.onCreateNote,
  })
  const openActionSheetQaTarget = useControllerQaTarget(actionSheetActions, workspaceSnapshot)
  const selectedNoteRead = useMobileNoteRead({ applyEdit: pipeline.applyWorkspaceEdit, note: navigation.selectedNote, repository, request: repositoryRequest })
  return {
    ...actionSheetActions,
    ...navigation,
    ...createActions,
    ...editorActions,
    ...fieldActions,
    ...selectedFolderActions,
    ...selectedViewActions,
    onApplyWorkspaceEdit: applyEdit,
    onOpenChangeNoteTypeForNote,
    ...controllerPresentation({ context: workspaceActionsContext, pipeline, defaultNoteWidth, selectedNoteRead, searchQuery, setSearchQuery, openActionSheetQaTarget }),
  }
}

function openMobileActionSheetQaTarget({
  actions,
  target,
  workspaceSnapshot,
}: {
  actions: ReturnType<typeof actionSheetWorkspaceActions>
  target: MobileActionSheetQaTarget
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  if (openSimpleMobileActionSheetQaTarget(actions, target)) return
  if (openDataBackedMobileActionSheetQaTarget(actions, target, workspaceSnapshot)) return
  actions.onOpenSearch()
}

function openSimpleMobileActionSheetQaTarget(
  actions: ReturnType<typeof actionSheetWorkspaceActions>,
  target: MobileActionSheetQaTarget,
) {
  if (target === 'addProperty') {
    actions.onAddProperty()
    return true
  }
  if (target === 'addRelationship') {
    actions.onAddRelationship()
    return true
  }
  if (target === 'createView') {
    actions.onOpenCreateView()
    return true
  }
  if (target === 'editTypeVisibility') {
    actions.onOpenTypeVisibility()
    return true
  }
  return false
}

function openDataBackedMobileActionSheetQaTarget(
  actions: ReturnType<typeof actionSheetWorkspaceActions>,
  target: MobileActionSheetQaTarget,
  workspaceSnapshot: MobileWorkspaceSnapshot,
) {
  if (target === 'editProperty') {
    const editableProperty = firstEditableProperty(workspaceSnapshot)
    if (editableProperty) actions.onOpenEditProperty(editableProperty.key, editableProperty.value)
    return true
  }
  if (target === 'editView') {
    const selection = firstSidebarItemSelection(workspaceSnapshot, 'views')
    if (selection) actions.onOpenViewActions(selection)
    return true
  }
  if (target === 'editTypeSection') {
    const selection = firstSidebarItemSelection(workspaceSnapshot, 'types')
    if (selection) actions.onOpenTypeActions(selection)
    return true
  }
  return false
}

function firstEditableProperty(snapshot: MobileWorkspaceSnapshot): { key: string, value: MobilePropertyValue } | null {
  const note = selectedSnapshotNote(snapshot)
  if (!note) return null

  const property = note.properties?.[0]
  if (property) return { key: property.key, value: property.value }
  if (note.tags.length > 0) return { key: 'tags', value: note.tags }
  if (note.status) return { key: 'Status', value: note.status }

  return null
}

function selectedSnapshotNote(snapshot: MobileWorkspaceSnapshot): MobileNote | null {
  const selectedNoteId = snapshot.selectedNoteId
  if (!selectedNoteId) return null

  return snapshot.notes.find((note) => note.id === selectedNoteId)
    ?? snapshot.allNotes?.find((note) => note.id === selectedNoteId)
    ?? null
}

function firstSidebarItemSelection(
  snapshot: MobileWorkspaceSnapshot,
  sectionId: string,
): MobileSidebarItemSelection | null {
  const item = snapshot.sidebarSections.find((section) => section.id === sectionId)?.items?.[0]
  if (!item) return null

  return {
    count: item.count,
    id: item.id,
    label: item.label,
    noteId: item.noteId,
    sectionId,
    typeName: item.typeName,
    viewId: item.viewId,
  }
}

function useControllerApplyEdit({
  applyWorkspaceEdit,
  navigation,
  setSelectedNoteId,
}: {
  applyWorkspaceEdit: ReturnType<typeof useWorkspaceEditPipeline>['applyWorkspaceEdit']
  navigation: TabletWorkspaceNavigation
  setSelectedNoteId: (noteId: string | null) => void
}) {
  return useCallback((edit: MobileWorkspaceEdit) => {
    void applyWorkspaceEdit(edit).then((result) => {
      if (result) selectAfterWorkspaceEdit({ edit, navigation, result, setSelectedNoteId })
    })
  }, [applyWorkspaceEdit, navigation, setSelectedNoteId])
}

function useCloseWorkspaceAction({
  resetForm,
  setOpenAction,
}: {
  resetForm: () => void
  setOpenAction: SetOpenAction
}) {
  return useCallback(() => {
    setOpenAction(null)
    resetForm()
  }, [resetForm, setOpenAction])
}

function useSaveSelectedEdit({
  applyEdit,
  closeAction,
  readOnlyForm,
  selectedNote,
}: {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  readOnlyForm: TabletReadOnlyForm
  selectedNote: MobileNote | null
}) {
  return useCallback((toEdit: (noteId: string) => MobileWorkspaceEdit | null) => {
    const targetId = readOnlyForm.targetNoteId || selectedNote?.id
    if (!targetId) return
    const edit = toEdit(targetId)
    if (!edit) return
    applyEdit(edit)
    closeAction()
  }, [applyEdit, closeAction, readOnlyForm.targetNoteId, selectedNote])
}

function useReadOnlyFormState() {
  const [readOnlyForm, setReadOnlyForm] = useState<TabletReadOnlyForm>(emptyReadOnlyForm)
  const updateReadOnlyForm = useCallback(<Key extends keyof TabletReadOnlyForm,>(key: Key, value: TabletReadOnlyForm[Key]) => {
    setReadOnlyForm((current) => ({ ...current, [key]: value }))
  }, [])

  return {
    readOnlyForm,
    resetForm: useCallback(() => setReadOnlyForm(emptyReadOnlyForm), []),
    updateReadOnlyForm,
  }
}

type ControllerPresentationInput = {
  context: WorkspaceActionsContext
  pipeline: ReturnType<typeof useWorkspaceEditPipeline>
  defaultNoteWidth: ReturnType<typeof mobileDefaultNoteWidthFromVaultConfig>
  selectedNoteRead: ReturnType<typeof useMobileNoteRead>
  searchQuery: string
  setSearchQuery: (query: string) => void
  openActionSheetQaTarget: (target: MobileActionSheetQaTarget) => void
}

function controllerFieldActions(context: WorkspaceActionsContext, saveSelectedEdit: SaveSelectedEdit) {
  const { applyEdit, closeAction, readOnlyForm, selectedNote, setOpenAction, updateReadOnlyForm, workspaceSnapshot } = context
  const propertyActions = propertyWorkspaceActions({
    applyEdit,
    closeAction,
    readOnlyForm,
    saveSelectedEdit,
    setOpenAction,
    updateReadOnlyForm,
    workspaceSnapshot,
  })
  const relationshipActions = relationshipWorkspaceActions({
    applyEdit,
    closeAction,
    readOnlyForm,
    saveSelectedEdit,
    selectedNote,
    updateReadOnlyForm,
  })
  const retargetActions = retargetWorkspaceActions({
    readOnlyForm,
    saveSelectedEdit,
    selectedNote,
    updateReadOnlyForm,
  })
  const noteIconActions = noteIconWorkspaceActions({
    readOnlyForm,
    saveSelectedEdit,
    updateReadOnlyForm,
  })
  return { ...noteIconActions, ...propertyActions, ...relationshipActions, ...retargetActions }
}

function controllerSelectedActions(context: WorkspaceActionsContext) {
  const { applyEdit, navigation, repositoryRequest, selectedNote, workspaceSnapshot } = context
  const editorActions = editorWorkspaceActions({
    applyEdit,
    repositoryRequest,
    selectedNote,
    workspaceSnapshot,
  })
  const selectedViewActions = selectedViewCommandActions({
    applyEdit,
    navigation,
    workspaceSnapshot,
  })
  const selectedFolderActions = selectedFolderCommandActions({
    applyEdit,
    sidebarSelection: navigation.sidebarSelection,
    vaultRootUri: repositoryRequest?.vaultRootUri ?? null,
  })
  return { editorActions, selectedFolderActions, selectedViewActions }
}

function controllerPresentation(input: ControllerPresentationInput) {
  const { context, pipeline, defaultNoteWidth, selectedNoteRead, searchQuery, setSearchQuery, openActionSheetQaTarget } = input
  const { navigation, openAction, readOnlyForm, repositoryRequest, selectedNote, workspaceSnapshot } = context
  const { retryFailedEdit, canRedoWorkspaceEdit, canUndoWorkspaceEdit, redoWorkspaceEdit, reloadWorkspaceSnapshot, undoWorkspaceEdit } = pipeline
  return {
    openAction,
    readOnlyForm,
    searchQuery,
    defaultNoteWidth,
    snapshot: workspaceSnapshot,
    retryFailedEdit,
    selectedNote,
    selectedNoteRead,
    vaultRootUri: repositoryRequest?.vaultRootUri ?? null,
    canRedoWorkspaceEdit,
    canUndoWorkspaceEdit,
    onEnterNeighborhood: navigation.selectNeighborhoodNote,
    onGoBack: navigation.goBack,
    onGoForward: navigation.goForward,
    onRedoWorkspaceEdit: redoWorkspaceEdit,
    onReloadVault: reloadWorkspaceSnapshot,
    onSelectFolder: navigation.selectFolder,
    onSelectNote: navigation.selectNote,
    onSelectSidebarItem: navigation.selectSidebarItem,
    onOpenActionSheetQaTarget: openActionSheetQaTarget,
    onSearchQueryChange: setSearchQuery,
    onUndoWorkspaceEdit: undoWorkspaceEdit
  }
}

function useControllerQaTarget(actions: ReturnType<typeof actionSheetWorkspaceActions>, workspaceSnapshot: MobileWorkspaceSnapshot) {
  return useCallback((target: MobileActionSheetQaTarget) => {
    openMobileActionSheetQaTarget({ actions, target, workspaceSnapshot })
  }, [actions, workspaceSnapshot])
}

function resolvedControllerNote(snapshot: MobileWorkspaceSnapshot, note: MobileNote | null) {
  const defaultNoteWidth = mobileDefaultNoteWidthFromVaultConfig(snapshot.vaultConfig)
  return {
    defaultNoteWidth,
    selectedNote: note ? mobileNoteWithResolvedWidth(note, defaultNoteWidth) : null,
  }
}
