import type { MobileWorkspaceEdit } from './mobileWorkspaceEditing'

export type MobileEditingParitySurface =
  | 'command-palette'
  | 'editor'
  | 'history'
  | 'inspector'
  | 'native-repository'
  | 'note-list'
  | 'sidebar'
  | 'type-section'
  | 'view-builder'

export type MobileEditingParityInventoryEntry = {
  desktopParity: string
  evidence: string[]
  surface: MobileEditingParitySurface[]
}

export const mobileEditingParityInventory = {
  addRelationship: entry({
    desktopParity: 'Properties panel relationship values use desktop frontmatter relationship keys and wikilink refs.',
    evidence: [
      'mobileWorkspaceRelationships reducer tests',
      'tablet and phone relationship suggestion/target Playwright flows',
      'native workspace persistence relationshipEdit proof',
    ],
    surface: ['inspector', 'native-repository'],
  }),
  bulkEdit: entry({
    desktopParity: 'Bulk note archive, organize, and delete commands preserve desktop note metadata writes.',
    evidence: [
      'mobileWorkspaceBulkEditing reducer test',
      'tablet and phone note-list bulk Playwright flows',
      'native workspace note path persistence bulkEdit proof',
    ],
    surface: ['note-list', 'native-repository'],
  }),
  changeNoteType: entry({
    desktopParity: 'Selected-note Type changes write the desktop `type` frontmatter property.',
    evidence: [
      'mobileWorkspaceEditing reducer tests',
      'mobile More-sheet change-type actions',
      'native workspace persistence changeNoteType proof',
    ],
    surface: ['inspector', 'native-repository'],
  }),
  createFolder: entry({
    desktopParity: 'Folder creation uses desktop vault-relative folder paths.',
    evidence: [
      'mobileWorkspaceEditing reducer tests',
      'tablet and phone folder action Playwright flows',
      'native workspace persistence folderCreated proof',
    ],
    surface: ['sidebar', 'native-repository'],
  }),
  createNote: entry({
    desktopParity: 'Note creation writes desktop Markdown files with compatible frontmatter defaults.',
    evidence: [
      'mobileWorkspaceNoteCreation reducer tests',
      'quick-open and typed-note creation Playwright flows',
      'native workspace persistence createNote proof',
    ],
    surface: ['command-palette', 'note-list', 'sidebar', 'native-repository'],
  }),
  createRelationshipTarget: entry({
    desktopParity: 'Relationship target creation writes a desktop note and links the source by wikilink ref.',
    evidence: [
      'mobileWorkspaceNoteCreation relationship-target tests',
      'tablet and phone relationship target Playwright flows',
      'native workspace persistence relationshipTarget proof',
    ],
    surface: ['inspector', 'native-repository'],
  }),
  createTypeDefinition: entry({
    desktopParity: 'Type creation writes desktop Type documents and sidebar Type sections.',
    evidence: [
      'mobileWorkspaceTypeEditing reducer tests',
      'tablet and phone Type section Playwright flows',
      'native workspace persistence createType proof',
    ],
    surface: ['sidebar', 'type-section', 'native-repository'],
  }),
  createView: entry({
    desktopParity: 'Saved-view creation serializes desktop-compatible view YAML.',
    evidence: [
      'mobileSavedViews serialization tests',
      'tablet and phone saved-view builder Playwright flows',
      'native workspace persistence createView proof',
    ],
    surface: ['sidebar', 'view-builder', 'native-repository'],
  }),
  deleteFolder: entry({
    desktopParity: 'Folder deletion removes desktop vault-relative folder trees.',
    evidence: [
      'mobileWorkspaceEditing reducer tests',
      'tablet and phone folder action Playwright flows',
      'native workspace persistence folderDeleted proof',
    ],
    surface: ['sidebar', 'native-repository'],
  }),
  deleteNote: entry({
    desktopParity: 'Note deletion removes the selected desktop vault file.',
    evidence: [
      'mobileWorkspaceEditing reducer tests',
      'tablet and phone More-sheet delete flows',
      'native workspace note path persistence deleteNote proof',
    ],
    surface: ['editor', 'note-list', 'native-repository'],
  }),
  deleteProperty: entry({
    desktopParity: 'Property deletion removes the matching desktop frontmatter key.',
    evidence: [
      'mobileFrontmatterWrites tests',
      'tablet and phone property deletion Playwright flows',
      'native workspace persistence propertyRelationship proof',
    ],
    surface: ['inspector', 'native-repository'],
  }),
  deleteTypeDefinition: entry({
    desktopParity: 'Type deletion removes desktop Type documents and sidebar Type sections.',
    evidence: [
      'mobileWorkspaceTypeEditing reducer tests',
      'tablet and phone Type section Playwright flows',
      'native workspace persistence deleteType proof',
    ],
    surface: ['sidebar', 'type-section', 'native-repository'],
  }),
  deleteView: entry({
    desktopParity: 'Saved-view deletion removes the desktop view YAML file.',
    evidence: [
      'mobileWorkspaceEditing reducer tests',
      'tablet and phone saved-view delete Playwright flows',
      'native workspace persistence deleteView proof',
    ],
    surface: ['sidebar', 'view-builder', 'native-repository'],
  }),
  hydrateNoteContent: entry({
    desktopParity: 'Markdown hydration derives desktop frontmatter, body title, wikilinks, properties, and relationships.',
    evidence: [
      'mobileWorkspaceEditing hydration tests',
      'local vault snapshot loader tests',
      'native workspace repository read/hydration probes',
    ],
    surface: ['editor', 'native-repository'],
  }),
  hydrateTextFileContent: entry({
    desktopParity: 'Text-file hydration preserves non-Markdown vault entries without frontmatter mutation.',
    evidence: [
      'mobileTextFileEditing tests',
      'file-entry action Playwright flows',
      'native workspace persistence textFile proof',
    ],
    surface: ['editor', 'native-repository'],
  }),
  moveFavorite: entry({
    desktopParity: 'Favorite reordering writes desktop favorite index metadata.',
    evidence: [
      'mobileWorkspaceFavoriteOrdering tests',
      'tablet and phone favorite action Playwright flows',
      'native workspace persistence moveFavorite proof',
    ],
    surface: ['sidebar', 'native-repository'],
  }),
  moveNoteToFolder: entry({
    desktopParity: 'Note moves rename desktop vault files and rewrite inbound wikilinks.',
    evidence: [
      'mobileWorkspaceEditing and mobileTypeDefinitionPathRewrites tests',
      'tablet and phone move-note actions',
      'native workspace persistence movedNote proof',
    ],
    surface: ['editor', 'sidebar', 'native-repository'],
  }),
  moveTypeSection: entry({
    desktopParity: 'Type section reordering writes desktop Type order metadata.',
    evidence: [
      'mobileWorkspaceTypeEditing reducer tests',
      'tablet and phone Type section move actions',
      'native workspace persistence moveTypeSection proof',
    ],
    surface: ['sidebar', 'type-section', 'native-repository'],
  }),
  moveView: entry({
    desktopParity: 'Saved-view reordering writes dense desktop view order metadata.',
    evidence: [
      'mobileSavedViews move/order tests',
      'tablet and phone saved-view move commands',
      'native workspace persistence moveView proof',
    ],
    surface: ['sidebar', 'view-builder', 'native-repository'],
  }),
  removeRelationship: entry({
    desktopParity: 'Relationship removal updates the desktop relationship frontmatter array or removes the key.',
    evidence: [
      'mobileWorkspaceRelationships reducer tests',
      'tablet and phone relationship removal Playwright flows',
      'native workspace persistence propertyRelationship proof',
    ],
    surface: ['inspector', 'native-repository'],
  }),
  renameFolder: entry({
    desktopParity: 'Folder renames move desktop vault directories and rewrite affected wikilinks.',
    evidence: [
      'mobileWorkspaceEditing and path-rewrite tests',
      'tablet and phone folder rename flows',
      'native workspace persistence folderRenamed proof',
    ],
    surface: ['sidebar', 'native-repository'],
  }),
  renameNoteFile: entry({
    desktopParity: 'Note file renames move desktop vault files and rewrite inbound wikilinks.',
    evidence: [
      'mobileWorkspaceEditing note path tests',
      'tablet and phone rename-file actions',
      'native workspace note path persistence renameNoteFile proof',
    ],
    surface: ['editor', 'native-repository'],
  }),
  renameTypeDefinition: entry({
    desktopParity: 'Type renames move desktop Type documents and rewrite schema/type refs.',
    evidence: [
      'mobileWorkspaceTypeEditing rename tests',
      'tablet and phone Type rename flows',
      'native workspace persistence renameType proof',
    ],
    surface: ['sidebar', 'type-section', 'native-repository'],
  }),
  restoreFolder: entry({
    desktopParity: 'Undo restores folder edits with desktop vault-relative paths.',
    evidence: [
      'tabletWorkspaceHistory restoration tests',
      'native workspace persistence restoreFolder proof',
    ],
    surface: ['history', 'sidebar', 'native-repository'],
  }),
  restoreNote: entry({
    desktopParity: 'Undo restores note edits with desktop Markdown file contents and list placement.',
    evidence: [
      'tabletWorkspaceHistory restoration tests',
      'native workspace persistence restoreNote proof',
    ],
    surface: ['history', 'note-list', 'native-repository'],
  }),
  restoreTypeDefinition: entry({
    desktopParity: 'Undo restores Type document edits and sidebar Type sections.',
    evidence: [
      'tabletWorkspaceHistory restoration tests',
      'native workspace persistence restoreType proof',
    ],
    surface: ['history', 'type-section', 'native-repository'],
  }),
  restoreView: entry({
    desktopParity: 'Undo restores saved-view YAML files and sidebar view sections.',
    evidence: [
      'tabletWorkspaceHistory restoration tests',
      'native workspace persistence restoreView proof',
    ],
    surface: ['history', 'view-builder', 'native-repository'],
  }),
  setArchived: entry({
    desktopParity: 'Archive state writes desktop archived frontmatter metadata.',
    evidence: [
      'mobileFrontmatterWrites tests',
      'tablet and phone archive/unarchive actions',
      'native workspace note path persistence bulk archive proof',
    ],
    surface: ['editor', 'note-list', 'native-repository'],
  }),
  setDefaultNoteWidth: entry({
    desktopParity: 'Default note width writes desktop-compatible vault config.',
    evidence: [
      'mobileNoteWidth tests',
      'command palette default-width Playwright flow',
      'native workspace persistence vaultConfig proof',
    ],
    surface: ['command-palette', 'native-repository'],
  }),
  setOrganized: entry({
    desktopParity: 'Organized state writes desktop `_organized` frontmatter metadata.',
    evidence: [
      'mobileWorkspaceBulkEditing tests',
      'tablet and phone organize actions',
      'native workspace note path persistence bulk organize proof',
    ],
    surface: ['editor', 'note-list', 'native-repository'],
  }),
  toggleFavorite: entry({
    desktopParity: 'Favorite toggles write desktop favorite metadata and ordering.',
    evidence: [
      'mobileWorkspaceFavoriteOrdering tests',
      'tablet and phone favorite actions',
      'native workspace persistence note metadata proof',
    ],
    surface: ['editor', 'sidebar', 'native-repository'],
  }),
  updateChecklistItem: entry({
    desktopParity: 'Checkbox lines (`- [ ]` / `- [x]`) and their `📅 YYYY-MM-DD` due marker are edited in place without touching other note content.',
    evidence: [
      'mobileTasks unit tests',
      'mobileWorkspaceEditing checklist reducer tests',
    ],
    surface: ['note-list', 'native-repository'],
  }),
  updateNoteContent: entry({
    desktopParity: 'Markdown edits save desktop-compatible frontmatter/body content from source and WYSIWYG editors.',
    evidence: [
      'mobileWorkspaceEditing reducer tests',
      'source editor Playwright flows',
      'native WYSIWYG mutation and persistence probes',
    ],
    surface: ['editor', 'native-repository'],
  }),
  updatePrimaryNoteListProperties: entry({
    desktopParity: 'Primary list display settings write desktop-compatible vault config.',
    evidence: [
      'mobilePrimaryNoteListPropertiesEditing tests',
      'tablet and phone primary note-list property Playwright flows',
      'native workspace persistence vaultConfig proof',
    ],
    surface: ['note-list', 'sidebar', 'native-repository'],
  }),
  updateProperty: entry({
    desktopParity: 'Property edits write desktop frontmatter scalars, booleans, numbers, dates, lists, colors, URLs, and title renames.',
    evidence: [
      'mobileFrontmatterWrites and mobilePropertyValues tests',
      'tablet and phone property action Playwright flows',
      'native workspace persistence propertyRelationship proof',
    ],
    surface: ['inspector', 'native-repository'],
  }),
  updatePropertyDisplayMode: entry({
    desktopParity: 'Property display-mode edits persist desktop-compatible Type schema display settings.',
    evidence: [
      'mobileWorkspacePropertyDisplayModeEditing tests',
      'property display-mode Playwright flow',
      'native workspace persistence vaultConfig proof',
    ],
    surface: ['inspector', 'type-section', 'native-repository'],
  }),
  updateTextFileContent: entry({
    desktopParity: 'Text-file edits save non-Markdown vault file content without frontmatter conversion.',
    evidence: [
      'mobileTextFileEditing tests',
      'file-entry action Playwright flows',
      'native workspace persistence textFile proof',
    ],
    surface: ['editor', 'native-repository'],
  }),
  updateTypeDefinition: entry({
    desktopParity: 'Type definition edits write desktop Type schemas, display properties, relationships, visibility, sort, and templates.',
    evidence: [
      'mobileTypeDefinitionSchema and mobileWorkspaceTypeEditing tests',
      'tablet and phone Type section customization flows',
      'native workspace persistence updateType proof',
    ],
    surface: ['type-section', 'native-repository'],
  }),
  updateView: entry({
    desktopParity: 'Saved-view edits serialize desktop-compatible filters, display properties, sort, icon, and color.',
    evidence: [
      'mobileSavedViews round-trip tests',
      'tablet and phone saved-view edit Playwright flows',
      'native workspace persistence updateView proof',
    ],
    surface: ['view-builder', 'native-repository'],
  }),
} satisfies Record<MobileWorkspaceEdit['type'], MobileEditingParityInventoryEntry>

export function mobileEditingParityInventoryEntries() {
  return Object.entries(mobileEditingParityInventory).map(([editType, inventory]) => ({
    editType: editType as MobileWorkspaceEdit['type'],
    ...inventory,
  }))
}

export function mobileEditingParityInventoryGaps() {
  return mobileEditingParityInventoryEntries().filter((entryItem) => (
    entryItem.desktopParity.trim().length === 0
      || entryItem.evidence.length === 0
      || entryItem.surface.length === 0
  ))
}

function entry(definition: MobileEditingParityInventoryEntry): MobileEditingParityInventoryEntry {
  return definition
}
