import type { MobileWorkspaceAction } from '../components/workspace/MobileWorkspaceActionSheet'
import { mobileCreateNoteDefaultsForType } from '../workspace/mobileCreateNoteDefaults'
import type { MobileWorkspaceEdit } from '../workspace/mobileWorkspaceEditing'
import type {
  MobileCreateNoteDefaults,
  MobileTypeDefinitions,
  MobileViewFilterGroup,
} from '../workspace/mobileWorkspaceModel'
import type { ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'
import { createNoteDefaultsForSelection } from './tabletWorkspaceCreateDefaults'
import type { TabletSidebarSelection } from './tabletWorkspaceNavigation'
import type { TabletReadOnlyForm } from './tabletWorkspaceTypes'
import { viewDefinitionCreateEdit } from './tabletWorkspaceViewDefinitionSave'
export {
  normalizedOptionalIcon,
  normalizedOptionalSort,
} from './tabletWorkspaceViewDefinitionNormalization'

type ApplyWorkspaceEdit = (edit: MobileWorkspaceEdit) => void
type ReadOnlyFormUpdater = <Key extends keyof TabletReadOnlyForm>(key: Key, value: TabletReadOnlyForm[Key]) => void
type SetOpenAction = (action: MobileWorkspaceAction | null) => void

type CreateNoteContext = {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  selection: TabletSidebarSelection
  title: string
  typeDefinitions?: MobileTypeDefinitions
}

type CreateTypedNoteContext = {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  typeDefinitions?: MobileTypeDefinitions
  typeName: string
}

export type TabletWorkspaceCreateActionsContext = {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  readOnlyForm: TabletReadOnlyForm
  repositoryRequest?: ReadOnlyWorkspaceRequest
  selectFolder: (folderId: string) => void
  selection: TabletSidebarSelection
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}

export function createWorkspaceNote({
  applyEdit,
  closeAction,
  selection,
  title,
  typeDefinitions,
}: CreateNoteContext) {
  applyEdit({
    defaults: createNoteDefaultsForSelection(selection, typeDefinitions),
    title,
    type: 'createNote',
  })
  closeAction()
}

export function createSmartWorkspaceNote({
  applyEdit,
  closeAction,
  markdownBody,
  selection,
  tags,
  title,
  typeDefinitions,
  typeName,
}: {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  markdownBody: string
  selection: TabletSidebarSelection
  tags: string[]
  title: string
  typeDefinitions?: MobileTypeDefinitions
  typeName: string
}) {
  const selectionDefaults = createNoteDefaultsForSelection(selection, typeDefinitions)
  const typeDefaults = typeName ? mobileCreateNoteDefaultsForType(typeName, typeDefinitions) : {}
  const defaults: MobileCreateNoteDefaults = {
    ...selectionDefaults,
    ...typeDefaults,
    ...(selectionDefaults.folderPath ? { folderPath: selectionDefaults.folderPath } : {}),
    type: typeName || typeDefaults.type || selectionDefaults.type || 'Note',
    tags: tags.length > 0 ? tags : typeDefaults.tags,
    template: markdownBody || typeDefaults.template,
  }
  applyEdit({
    defaults,
    title: title.trim() || 'Neue Notiz',
    type: 'createNote',
  })
  closeAction()
}

export function createTypedWorkspaceNote({
  applyEdit,
  closeAction,
  typeDefinitions,
  typeName,
}: CreateTypedNoteContext) {
  const defaults = mobileCreateNoteDefaultsForType(typeName, typeDefinitions)
  createWorkspaceNoteFromDefaults({ applyEdit, closeAction, defaults, title: '' })
}

export function createWorkspaceView({
  applyEdit,
  closeAction,
  displayProperties,
  filters,
  icon,
  name,
  sort,
  tone,
}: {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  displayProperties: string[]
  filters: MobileViewFilterGroup
  icon: string
  name: string
  sort: string
  tone: string | null
}) {
  const edit = viewDefinitionCreateEdit({
    viewDisplayProperties: displayProperties,
    viewFilters: filters,
    viewIcon: icon,
    viewName: name,
    viewSort: sort,
    viewTone: tone,
  })
  if (!edit) return

  applyEdit(edit)
  closeAction()
}

export function createWorkspaceNoteInFolderEdit(folderPath: string): MobileWorkspaceEdit {
  return {
    defaults: { folderPath },
    title: '',
    type: 'createNote',
  }
}

function createWorkspaceNoteFromDefaults({
  applyEdit,
  closeAction,
  defaults,
  title,
}: {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  defaults: MobileCreateNoteDefaults
  title: string
}) {
  applyEdit({ defaults, title, type: 'createNote' })
  closeAction()
}
