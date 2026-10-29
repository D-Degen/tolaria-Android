import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { applyMobileWorkspaceEditWithWrites } from './mobileWorkspaceEditing'
import type { MobileNote, MobileSidebarFolder, MobileWorkspaceSnapshot } from './mobileWorkspaceModel'

type MarkdownContent = string
type NoteId = string
type NotePath = string
type WikilinkTarget = string

const occupiedNoteDestinations = [
  {
    edit: {
      folderPath: 'Writing/Essays',
      noteId: 'workflow-orchestration',
      type: 'moveNoteToFolder' as const,
    },
    existing: {
      id: 'Writing/Essays/Workflow Orchestration Essay.md',
      path: 'Writing/Essays/Workflow Orchestration Essay.md',
      title: 'Existing Workflow Essay',
    },
    label: 'moving notes between folders',
  },
  {
    edit: {
      filenameStem: 'manual-name',
      noteId: 'workflow-orchestration',
      type: 'renameNoteFile' as const,
    },
    existing: {
      id: 'Tolaria/Mobile UI/manual-name.md',
      path: 'Tolaria/Mobile UI/manual-name.md',
      title: 'Existing Manual Name',
    },
    label: 'renaming note filenames',
  },
]

describe('applyMobileWorkspaceEdit', () => {
  it('moves notes to another folder by changing the relative path and planning a move write', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nMove me.\n',
    }
    const result = applyMobileWorkspaceEditWithWrites({
      ...base,
      folderPaths: ['Writing/Essays'],
      notes: [editableNote, ...base.notes.slice(1)],
    }, {
      folderPath: 'Writing/Essays',
      noteId: 'workflow-orchestration',
      type: 'moveNoteToFolder',
    })
    const note = result.snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')

    expect(note?.path).toBe('Writing/Essays/Workflow Orchestration Essay.md')
    expect(result.snapshot.selectedNoteId).toBe('workflow-orchestration')
    expect(result.writes).toEqual([
      {
        kind: 'moveNote',
        path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
        toPath: 'Writing/Essays/Workflow Orchestration Essay.md',
      },
    ])
    expect(sidebarFolders(result.snapshot)).toContainEqual(
      expect.objectContaining({ id: 'Writing/Essays', name: 'Essays' }),
    )
  })

  it('updates inbound wikilinks and relationship refs when notes move folders', () => {
    const { movedSource, referringNote, snapshot } = workspaceMoveLinkScenario()
    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      folderPath: 'Writing/Essays',
      noteId: movedSource.id,
      type: 'moveNoteToFolder',
    })
    const updatedRef = noteById(result.snapshot, referringNote.id)

    expectRetargetedWikilinks(updatedRef, movedSource.id, 'Writing/Essays/Workflow Orchestration Essay')
    expectRetargetedWikilinkWrites(result.writes, {
      destinationPath: 'Writing/Essays/Workflow Orchestration Essay.md',
      refContent: updatedRef.rawContent ?? '',
    })
  })

  it('renames note filenames while preserving titles and updating inbound wikilinks', () => {
    const { movedSource, referringNote, snapshot } = workspaceMoveLinkScenario()
    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      filenameStem: 'manual-name.md',
      noteId: movedSource.id,
      type: 'renameNoteFile',
    })
    const renamed = noteById(result.snapshot, movedSource.id)
    const updatedRef = noteById(result.snapshot, referringNote.id)

    expect(renamed).toMatchObject({
      path: 'Tolaria/Mobile UI/manual-name.md',
      rawContent: '# Workflow Orchestration Essay\n\nMove me.\n',
      title: 'Workflow Orchestration Essay',
    })
    expectRetargetedWikilinks(updatedRef, movedSource.id, 'Tolaria/Mobile UI/manual-name')
    expectRetargetedWikilinkWrites(result.writes, {
      destinationPath: 'Tolaria/Mobile UI/manual-name.md',
      refContent: updatedRef.rawContent ?? '',
    })
  })

  it('renames note files after desktop title frontmatter edits and rewrites inbound wikilinks', () => {
    const { movedSource, referringNote, snapshot } = workspaceMoveLinkScenario()
    const editableSource = {
      ...movedSource,
      rawContent: [
        '---',
        'title: Workflow Orchestration Essay',
        'type: Essay',
        '---',
        'Body without an H1.',
        '',
      ].join('\n'),
    }
    const result = applyMobileWorkspaceEditWithWrites({
      ...snapshot,
      allNotes: [editableSource, referringNote],
      notes: [editableSource, referringNote],
    }, {
      key: 'title',
      noteId: movedSource.id,
      type: 'updateProperty',
      value: 'Renamed Workflow Essay',
    })
    const renamed = noteById(result.snapshot, movedSource.id)
    const updatedRef = noteById(result.snapshot, referringNote.id)

    expect(renamed).toMatchObject({
      path: 'Tolaria/Mobile UI/renamed-workflow-essay.md',
      title: 'Renamed Workflow Essay',
    })
    expect(renamed.rawContent).toContain('title: Renamed Workflow Essay')
    expectRetargetedWikilinks(updatedRef, movedSource.id, 'Tolaria/Mobile UI/renamed-workflow-essay', 'Renamed Workflow Essay')
    expect(result.writes).toEqual([
      {
        content: renamed.rawContent,
        kind: 'saveNote',
        path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
      },
      {
        kind: 'moveNote',
        path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
        toPath: 'Tolaria/Mobile UI/renamed-workflow-essay.md',
      },
      {
        content: updatedRef.rawContent,
        kind: 'saveNote',
        path: 'Refs.md',
      },
    ])
  })

  it('syncs initial H1 heading in markdown body and renames file when title property is updated', () => {
    const { movedSource, snapshot } = workspaceMoveLinkScenario()
    const editableSource = {
      ...movedSource,
      rawContent: [
        '---',
        'title: Old Title',
        'type: Essay',
        '---',
        '# Old Title',
        '',
        'Paragraph content.',
      ].join('\n'),
    }
    const result = applyMobileWorkspaceEditWithWrites({
      ...snapshot,
      allNotes: [editableSource],
      notes: [editableSource],
    }, {
      key: 'title',
      noteId: movedSource.id,
      type: 'updateProperty',
      value: 'New Synced Title',
    })
    const renamed = noteById(result.snapshot, movedSource.id)

    expect(renamed).toMatchObject({
      path: 'Tolaria/Mobile UI/new-synced-title.md',
      title: 'New Synced Title',
    })
    expect(renamed.rawContent).toContain('title: New Synced Title')
    expect(renamed.rawContent).toContain('# New Synced Title\n\nParagraph content.')
  })

  it.each(occupiedNoteDestinations)('does not overwrite an existing destination when $label', ({ edit, existing }) => {
    const base = workspaceScenarioForId('default')
    const existingDestination = {
      ...base.notes[1],
      ...existing,
    }
    const result = applyMobileWorkspaceEditWithWrites({
      ...base,
      allNotes: [base.notes[0], existingDestination],
      notes: [base.notes[0], existingDestination],
    }, edit)

    expect(result.snapshot.notes[0]?.path).toBe('Tolaria/Mobile UI/Workflow Orchestration Essay.md')
    expect(result.writes).toEqual([])
  })

  it('rejects desktop-invalid note filename stems', () => {
    const base = workspaceScenarioForId('default')
    const result = applyMobileWorkspaceEditWithWrites(base, {
      filenameStem: 'quarterly:plan',
      noteId: 'workflow-orchestration',
      type: 'renameNoteFile',
    })

    expect(result.snapshot.notes[0]?.path).toBe('Tolaria/Mobile UI/Workflow Orchestration Essay.md')
    expect(result.writes).toEqual([])
  })

  it.each([
    {
      edit: (noteId: NoteId) => ({
        folderPath: '/Writing/Essays/',
        noteId,
        type: 'moveNoteToFolder' as const,
      }),
      expected: {
        id: 'Writing/Essays/Workflow Orchestration Essay.md',
        path: 'Writing/Essays/Workflow Orchestration Essay.md',
      },
      label: 'moves folders',
    },
    {
      edit: (noteId: NoteId) => ({
        filenameStem: 'manual-name',
        noteId,
        type: 'renameNoteFile' as const,
      }),
      expected: {
        id: 'Tolaria/Mobile UI/manual-name.md',
        path: 'Tolaria/Mobile UI/manual-name.md',
        title: 'Workflow Orchestration Essay',
      },
      label: 'changes filenames',
    },
  ])('retargets path-backed note ids when a local-vault note $label', ({ edit, expected }) => {
    const base = workspaceScenarioForId('default')
    const pathBackedNote = {
      ...base.notes[0],
      id: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    }
    const result = applyMobileWorkspaceEditWithWrites({
      ...base,
      folderPaths: ['Writing/Essays'],
      notes: [pathBackedNote, ...base.notes.slice(1)],
      selectedNoteId: pathBackedNote.id,
    }, edit(pathBackedNote.id))

    expect(result.snapshot.selectedNoteId).toBe(expected.id)
    expect(result.snapshot.notes[0]).toMatchObject(expected)
  })

  it('creates empty folders in the sidebar without creating notes', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      name: 'Drafts',
      parentPath: 'Writing',
      type: 'createFolder',
    })

    expect(result.snapshot.notes.map((note) => note.title)).not.toContain('Drafts')
    expect(result.snapshot.folderPaths).toContain('Writing/Drafts')
    expect(sidebarFolders(result.snapshot)).toContainEqual(
      expect.objectContaining({ id: 'Writing/Drafts', name: 'Drafts' }),
    )
    expect(result.writes).toEqual([{ kind: 'createFolder', path: 'Writing/Drafts' }])
  })

  it('renames folder subtrees and updates path-based wikilinks', () => {
    const { movedSource, referringNote, snapshot } = workspaceMoveLinkScenario()
    const result = applyMobileWorkspaceEditWithWrites({
      ...snapshot,
      folderPaths: ['Tolaria', 'Tolaria/Mobile UI'],
    }, {
      folderPath: 'Tolaria',
      name: 'Research',
      type: 'renameFolder',
    })
    const renamedSource = noteById(result.snapshot, movedSource.id)
    const updatedRef = noteById(result.snapshot, referringNote.id)

    expect(renamedSource.path).toBe('Research/Mobile UI/Workflow Orchestration Essay.md')
    expect(result.snapshot.folderPaths).toContain('Research/Mobile UI')
    expect(sidebarFolders(result.snapshot)).toContainEqual(
      expect.objectContaining({ id: 'Research/Mobile UI', name: 'Mobile UI' }),
    )
    expectRetargetedWikilinks(updatedRef, movedSource.id, 'Research/Mobile UI/Workflow Orchestration Essay')
    expect(result.writes).toEqual([
      { kind: 'renameFolder', path: 'Tolaria', toPath: 'Research' },
      {
        content: updatedRef.rawContent,
        kind: 'saveNote',
        path: updatedRef.path,
      },
    ])
  })

  it('deletes folder subtrees from the visible and complete note pools', () => {
    const base = workspaceScenarioForId('default')
    const result = applyMobileWorkspaceEditWithWrites({
      ...base,
      allNotes: base.notes,
      folderPaths: ['Tolaria', 'Tolaria/Mobile UI'],
    }, {
      folderPath: 'Tolaria',
      type: 'deleteFolder',
    })

    expect(result.snapshot.notes.some((note) => note.path?.startsWith('Tolaria/'))).toBe(false)
    expect(result.snapshot.allNotes?.some((note) => note.path?.startsWith('Tolaria/'))).toBe(false)
    expect(result.snapshot.folderPaths).not.toContain('Tolaria/Mobile UI')
    expect(result.writes).toEqual([{ kind: 'deleteFolder', path: 'Tolaria' }])
  })
})

function sidebarFolders(snapshot: MobileWorkspaceSnapshot) {
  const folders = snapshot.sidebarSections.find((section) => section.id === 'folders')?.folders ?? []
  return flattenSidebarFolders(folders)
}

function flattenSidebarFolders(folders: MobileSidebarFolder[]): MobileSidebarFolder[] {
  return folders.flatMap((folder) => [folder, ...flattenSidebarFolders(folder.children)])
}

function workspaceMoveLinkScenario() {
  const base = workspaceScenarioForId('default')
  const movedSource = {
    ...base.notes[0],
    rawContent: '# Workflow Orchestration Essay\n\nMove me.\n',
  }
  const referringNote = {
    ...base.notes[1],
    id: 'Refs.md',
    path: 'Refs.md',
    rawContent: movedReferenceContent(),
  }

  return {
    movedSource,
    referringNote,
    snapshot: {
      ...base,
      allNotes: [movedSource, referringNote],
      folderPaths: ['Writing/Essays'],
      notes: [movedSource, referringNote],
    },
  }
}

function movedReferenceContent(): MarkdownContent {
  return [
    '---',
    'related_to:',
    '  - [[Workflow Orchestration Essay]]',
    'belongs_to:',
    '  - [[Tolaria/Mobile UI/Workflow Orchestration Essay|Workflow]]',
    '---',
    '# Ref',
    '',
    'See [[Tolaria/Mobile UI/Workflow Orchestration Essay|essay]] before launch.',
    '',
  ].join('\n')
}

function noteById(snapshot: MobileWorkspaceSnapshot, noteId: NoteId): MobileNote {
  const note = snapshot.allNotes?.find((candidate) => candidate.id === noteId)
  if (!note) throw new Error(`Missing note ${noteId}`)
  return note
}

function expectRetargetedWikilinks(
  note: MobileNote,
  movedNoteId: NoteId,
  target: WikilinkTarget,
  title = 'Workflow Orchestration Essay',
) {
  const content = note.rawContent ?? ''
  expect(content).toContain(`[[${target}]]`)
  expect(content).toContain(`[[${target}|Workflow]]`)
  expect(content).toContain(`[[${target}|essay]]`)
  expect(content).not.toContain('[[Workflow Orchestration Essay]]')
  expect(content).not.toContain('[[Tolaria/Mobile UI/Workflow Orchestration Essay')
  expect(note.relationships.find((relationship) => relationship.key === 'related_to')?.values[0]).toMatchObject({
    id: movedNoteId,
    ref: `[[${target}]]`,
    title,
  })
  expect(note.relationships.find((relationship) => relationship.key === 'belongs_to')?.values[0]).toMatchObject({
    id: movedNoteId,
    ref: `[[${target}|Workflow]]`,
    title,
  })
}

function expectRetargetedWikilinkWrites(
  writes: ReturnType<typeof applyMobileWorkspaceEditWithWrites>['writes'],
  {
    destinationPath,
    refContent,
  }: {
    destinationPath: NotePath
    refContent: MarkdownContent
  },
) {
  expect(writes).toEqual([
    {
      kind: 'moveNote',
      path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
      toPath: destinationPath,
    },
    {
      content: refContent,
      kind: 'saveNote',
      path: 'Refs.md',
    },
  ])
}
