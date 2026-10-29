import { StyleSheet } from 'react-native'
import { mobileText } from '../../i18n/mobileText'
import type { MobileWorkspaceAction } from './MobileWorkspaceActionSheet.types'

export function actionTitle(action: MobileWorkspaceAction, propertyName: string) {
  if (action === 'editProperty' && propertyName.trim()) return propertyName.trim()
  if (!Object.hasOwn(actionTitleByAction, action)) return ''
  const title = mobileText(actionTitleByAction[action])
  return action === 'addRelationship' ? title.replace(/^\+\s*/, '') : title
}

const actionTitleByAction: Record<MobileWorkspaceAction, Parameters<typeof mobileText>[0]> = {
  addProperty: 'inspector.properties.addProperty',
  addRelationship: 'inspector.relationship.addRelationship',
  changeNoteType: 'command.note.changeType',
  createFolder: 'sidebar.action.createFolder',
  createType: 'sidebar.action.createType',
  createView: 'viewDialog.title.create',
  editFolder: 'sidebar.action.renameFolder',
  editFavorite: 'sidebar.group.favorites',
  editProperty: 'inspector.title.properties',
  editPrimaryListProperties: 'noteList.properties.customizeColumns',
  editTypeSection: 'sidebar.section.name',
  editTypeVisibility: 'sidebar.section.showInSidebar',
  editView: 'viewDialog.title.edit',
  findInNote: 'command.note.findInNote',
  moreActions: 'editor.toolbar.moreActions',
  moveNoteToFolder: 'command.note.moveToFolder',
  renameNoteFile: 'editor.filename.rename',
  replaceInNote: 'command.note.replaceInNote',
  search: 'noteList.searchAction',
  setNoteIcon: 'command.note.setIcon',
  smartCreateNote: 'noteList.createNote',
  smartNotes: 'editor.toolbar.openAi',
  tableOfContents: 'tableOfContents.title',
}

export const phoneSheetStyles = StyleSheet.create({
  container: { paddingHorizontal: 8, paddingVertical: 8 },
  sheet: { maxHeight: '100%' },
  compactBody: { flex: 1 },
  compactContent: { padding: 8 },
})
