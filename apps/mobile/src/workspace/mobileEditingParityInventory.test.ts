import { describe, expect, it } from 'vitest'
import {
  mobileEditingParityInventoryEntries,
  mobileEditingParityInventoryGaps,
} from './mobileEditingParityInventory'

describe('mobile editing parity inventory', () => {
  it('keeps every mobile workspace edit variant tied to desktop parity evidence', () => {
    expect(mobileEditingParityInventoryGaps()).toEqual([])
  })

  it('requires native persistence or native repository evidence for every edit variant', () => {
    const entriesWithoutNativeEvidence = mobileEditingParityInventoryEntries()
      .filter((entry) => !entry.surface.includes('native-repository'))
      .map((entry) => entry.editType)

    expect(entriesWithoutNativeEvidence).toEqual([])
  })

  it('documents the full current editing surface, excluding Git sync and AI by construction', () => {
    const editTypes = mobileEditingParityInventoryEntries().map((entry) => entry.editType).sort()

    expect(editTypes).toEqual([
      'addRelationship',
      'bulkEdit',
      'changeNoteType',
      'createFolder',
      'createNote',
      'createRelationshipTarget',
      'createTypeDefinition',
      'createView',
      'deleteFolder',
      'deleteNote',
      'deleteProperty',
      'deleteTypeDefinition',
      'deleteView',
      'hydrateNoteContent',
      'hydrateTextFileContent',
      'moveFavorite',
      'moveNoteToFolder',
      'moveTypeSection',
      'moveView',
      'removeRelationship',
      'renameFolder',
      'renameNoteFile',
      'renameTypeDefinition',
      'restoreFolder',
      'restoreNote',
      'restoreTypeDefinition',
      'restoreView',
      'setArchived',
      'setDefaultNoteWidth',
      'setOrganized',
      'toggleFavorite',
      'updateChecklistItem',
      'updateNoteContent',
      'updatePrimaryNoteListProperties',
      'updateProperty',
      'updatePropertyDisplayMode',
      'updateTextFileContent',
      'updateTypeDefinition',
      'updateView',
    ])
  })
})
