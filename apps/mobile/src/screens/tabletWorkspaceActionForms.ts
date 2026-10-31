import type { MobileWorkspaceAction } from '../components/workspace/MobileWorkspaceActionSheet'
import type { MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import type { MobileWorkspaceEdit } from '../workspace/mobileWorkspaceEditing'
import type { TabletReadOnlyForm } from './tabletWorkspaceTypes'
import type { ReadOnlyFormField } from './tabletWorkspaceTypeDefinitionFields'
import { moveTypeSectionEdit, moveViewEdit } from './tabletWorkspaceSidebarEditActions'
import type { SetOpenAction, ReadOnlyFormUpdater } from './tabletWorkspaceController.types'

export const emptyReadOnlyForm: TabletReadOnlyForm = {
  allNotesShowImages: false,
  allNotesShowPdfs: false,
  allNotesShowUnsupported: false,
  createTitle: '',
  editingFavoriteNoteId: '',
  editingFolderPath: '',
  editingViewId: '',
  filenameStem: '',
  folderName: '',
  folderParentPath: '',
  folderPath: '',
  noteIcon: '',
  noteType: '',
  targetNoteId: '',
  primaryDisplayProperties: [],
  primaryItemId: '',
  primaryPropertyQuery: '',
  propertyName: '',
  propertyValue: '',
  propertyValueKind: 'string',
  relationshipName: '',
  relationshipNoteRef: '',
  relationshipNoteTitle: '',
  typeDisplayProperties: [],
  typeName: '',
  typePropertyQuery: '',
  typeSchemaProperties: [],
  typeSchemaPropertyName: '',
  typeSchemaPropertyValue: '',
  typeSchemaRelationships: [],
  typeSchemaRelationshipName: '',
  typeSchemaRelationshipTargetRef: '',
  typeSchemaRelationshipTarget: '',
  typeSectionLabel: '',
  typeRenameName: '',
  typeSort: '',
  typeTemplate: '',
  typeIcon: 'file',
  typeTone: 'gray',
  typeVisible: true,
  viewDisplayProperties: [],
  viewFilters: { all: [] },
  viewIcon: '',
  viewName: '',
  viewPropertyQuery: '',
  viewSort: '',
  viewTone: null,
}

export function addRelationshipFields(key?: string): ReadOnlyFormField[] {
  return [
    { key: 'relationshipName', value: key ?? '' },
    { key: 'relationshipNoteRef', value: '' },
    { key: 'relationshipNoteTitle', value: '' },
  ]
}

export function workspaceActionOpener({
  setOpenAction,
  updateReadOnlyForm,
}: {
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  return (action: MobileWorkspaceAction, fields: ReadOnlyFormField[]) => openWorkspaceAction({
    action,
    fields,
    setOpenAction,
    updateReadOnlyForm,
  })
}

export function openWorkspaceAction({
  action,
  fields,
  setOpenAction,
  updateReadOnlyForm,
}: {
  action: MobileWorkspaceAction
  fields: ReadOnlyFormField[]
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  for (const { key, value } of fields) updateReadOnlyForm(key, value)
  setOpenAction(action)
}

export function workspaceNotes(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.allNotes ?? snapshot.notes
}

export function moveWorkspaceSidebarItem({
  applyEdit,
  direction,
  itemId,
  kind,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  direction: 'down' | 'up'
  itemId: string
  kind: 'typeSection' | 'view'
}) {
  applyNonEmptyStringEdit({
    applyEdit,
    toEdit: (trimmedId) => moveSidebarItemEdit(kind, trimmedId, direction),
    value: itemId,
  })
}

export function moveSidebarItemEdit(
  kind: 'typeSection' | 'view',
  itemId: string,
  direction: 'down' | 'up',
): MobileWorkspaceEdit {
  const edit = kind === 'view'
    ? moveViewEdit(itemId, direction)
    : moveTypeSectionEdit(itemId, direction)
  if (!edit) throw new Error(`Invalid sidebar item id for ${kind}`)
  return edit
}

export function applyNonEmptyStringEdit({
  applyEdit,
  closeAction,
  toEdit,
  value,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction?: () => void
  toEdit: (value: string) => MobileWorkspaceEdit | null
  value: string
}) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return

  const edit = toEdit(trimmedValue)
  if (!edit) return

  applyEdit(edit)
  closeAction?.()
}
