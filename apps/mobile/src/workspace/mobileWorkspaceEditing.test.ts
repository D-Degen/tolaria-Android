import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { applyMobileWorkspaceEdit, applyMobileWorkspaceEditWithWrites, replaceTrailingWikilinkQuery, trailingWikilinkQuery } from './mobileWorkspaceEditing'
import type { MobileWorkspaceSnapshot } from './mobileWorkspaceModel'
import { sidebarItems } from './mobileWorkspaceEditingTestSupport'

describe('applyMobileWorkspaceEdit', () => {
  it('updates note content and re-derives title, snippet, links, and editor blocks', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      content: '---\ntype: Essay\nStatus: Draft\n_favorite: true\ntags:\n  - Design\n---\n# Revised Mobile Essay\n\nA body with [[open-source-project]].\n\n## Details\n\n- One\n',
      noteId: 'workflow-orchestration',
      type: 'updateNoteContent',
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    expect(note).toMatchObject({
      favorite: true,
      links: 1,
      snippet: 'A body with open-source-project.',
      status: 'Draft',
      title: 'Revised Mobile Essay',
      type: 'Essay',
    })
    expect(note?.editorBlocks?.some((block) => block.kind === 'heading')).toBe(true)
    expect(note?.editorBlocks?.[0]).toMatchObject({
      content: expect.arrayContaining([
        { text: 'open-source-project', wikilinkTarget: 'open-source-project' },
      ]),
      kind: 'paragraph',
    })
  })

  it('removes existing fixture relationships without dropping the other relationship groups', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      key: 'related_to',
      noteId: 'workflow-orchestration',
      ref: '[[Release Notes]]',
      type: 'removeRelationship',
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    const relatedToRefs = note?.relationships.find((candidate) => candidate.key === 'related_to')?.values.map((value) => value.ref)
    const belongsToRefs = note?.relationships.find((candidate) => candidate.key === 'belongs_to')?.values.map((value) => value.ref)

    expect(relatedToRefs ?? []).not.toContain('[[Release Notes]]')
    expect(belongsToRefs).toEqual(['[[LLM Workflow]]', '[[Tolaria MVP]]'])
  })

  it('writes scalar properties into frontmatter and exposes them as properties', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      key: 'priority',
      noteId: 'workflow-orchestration',
      type: 'updateProperty',
      value: 'High',
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    expect(note?.rawContent).toContain('priority: High')
    expect(note?.properties).toContainEqual({ key: 'priority', label: 'Priority', value: 'High' })
  })

  it('preserves desktop scalar-array properties when re-deriving edited note content', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      content: '---\ntype: Essay\nscore: [1, true, "Needs Review"]\n---\n# Revised Mobile Essay\n\nA body.\n',
      noteId: 'workflow-orchestration',
      type: 'updateNoteContent',
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    expect(note?.properties).toContainEqual({
      key: 'score',
      label: 'Score',
      value: ['1', 'true', 'Needs Review'],
    })
  })

  it('writes tag lists as frontmatter arrays and re-derives note tags', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      key: 'tags',
      noteId: 'release-2026-05-02',
      type: 'updateProperty',
      value: ['Tolaria MVP', 'Design'],
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'release-2026-05-02')
    expect(note?.rawContent).toContain('tags:\n  - Tolaria MVP\n  - Design')
    expect(note?.tags).toEqual(['Tolaria MVP', 'Design'])
  })

  it('adds and removes typed relationships using exact wikilink refs', () => {
    const withRelationship = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      key: 'belongs_to',
      noteId: 'workflow-orchestration',
      targetTitle: 'How I Run an Open Source Project',
      type: 'addRelationship',
    })

    const note = withRelationship.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    const relationship = note?.relationships.find((candidate) => candidate.key === 'belongs_to')
    const ref = relationship?.values.find((value) => value.title === 'How I Run an Open Source Project')?.ref

    expect(ref).toBe('[[Tolaria/Mobile UI/How I Run an Open Source Project]]')
    expect(relationship?.values.at(-1)).toMatchObject({
      title: 'How I Run an Open Source Project',
      type: 'Procedure',
      typeTone: 'purple',
    })

    const withoutRelationship = applyMobileWorkspaceEdit(withRelationship, {
      key: 'belongs_to',
      noteId: 'workflow-orchestration',
      ref: ref ?? '',
      type: 'removeRelationship',
    })

    const updatedNote = withoutRelationship.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    const refs = updatedNote?.relationships.find((candidate) => candidate.key === 'belongs_to')?.values.map((value) => value.ref)
    expect(refs ?? []).not.toContain(ref)
  })

  it('resolves typed relationships through desktop wikilink aliases, path stems, and folded title targets', () => {
    const base = workspaceScenarioForId('default')
    const notes = base.notes.map((note) => note.id === 'open-source-project'
      ? { ...note, aliases: ['OSS Project'] }
      : note)
      .concat({
        ...base.notes[1],
        id: 'journal/cafe-notes.md',
        path: 'journal/cafe-notes.md',
        title: 'Café Notes',
      })
    const aliasedSnapshot = { ...base, allNotes: notes, notes }

    const withAliasRelationship = applyMobileWorkspaceEdit(aliasedSnapshot, {
      key: 'belongs_to',
      noteId: 'workflow-orchestration',
      targetTitle: 'OSS Project',
      type: 'addRelationship',
    })
    const withPathRelationship = applyMobileWorkspaceEdit(withAliasRelationship, {
      key: 'related_to',
      noteId: 'workflow-orchestration',
      targetTitle: 'Tolaria/Mobile UI/How I Run an Open Source Project',
      type: 'addRelationship',
    })
    const withFoldedTitleRelationship = applyMobileWorkspaceEdit(withPathRelationship, {
      key: 'has',
      noteId: 'workflow-orchestration',
      targetTitle: 'Cafe Notes.md',
      type: 'addRelationship',
    })

    const note = withFoldedTitleRelationship.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    expect(note?.relationships.find((relationship) => relationship.key === 'belongs_to')?.values).toContainEqual(
      expect.objectContaining({
        ref: '[[Tolaria/Mobile UI/How I Run an Open Source Project]]',
        title: 'How I Run an Open Source Project',
      }),
    )
    expect(note?.relationships.find((relationship) => relationship.key === 'related_to')?.values).toContainEqual(
      expect.objectContaining({
        ref: '[[Tolaria/Mobile UI/How I Run an Open Source Project]]',
        title: 'How I Run an Open Source Project',
      }),
    )
    expect(note?.relationships.find((relationship) => relationship.key === 'has')?.values).toContainEqual(
      expect.objectContaining({
        ref: '[[journal/cafe-notes]]',
        title: 'Café Notes',
      }),
    )
  })

  it('rebuilds primary and favorites sidebar sections after note state edits', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nArchive me.\n',
    }
    const archived = applyMobileWorkspaceEdit({ ...base, notes: [editableNote, ...base.notes.slice(1)] }, {
      archived: true,
      noteId: editableNote.id,
      type: 'setArchived',
    })

    expect(sidebarItems(archived, 'primary')).toEqual([
      expect.objectContaining({ count: '2', id: 'inbox' }),
      expect.objectContaining({ count: '0', id: 'tasks' }),
      expect.objectContaining({ count: '2', id: 'all-notes' }),
      expect.objectContaining({ count: '1', id: 'archive' }),
    ])
    expect(sidebarItems(archived, 'favorites')).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Workflow Orchestration Essay' })]),
    )

    const favorited = applyMobileWorkspaceEdit(base, {
      noteId: 'open-source-project',
      type: 'toggleFavorite',
    })

    expect(sidebarItems(favorited, 'favorites')).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'How I Run an Open Source Project' })]),
    )
  })

  it('archives notes through frontmatter and exposes the derived archive state', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nArchive me.\n',
    }
    const result = applyMobileWorkspaceEditWithWrites({ ...base, notes: [editableNote, ...base.notes.slice(1)] }, {
      archived: true,
      noteId: editableNote.id,
      type: 'setArchived',
    })
    const archivedNote = result.snapshot.notes.find((note) => note.id === editableNote.id)

    expect(archivedNote).toMatchObject({ archived: true })
    expect(archivedNote?.rawContent).toContain('_archived: true')
    expect(result.writes).toEqual([{
      content: expect.stringContaining('_archived: true'),
      kind: 'saveNote',
      path: archivedNote?.path,
    }])
  })

  it('marks notes organized through frontmatter and updates inbox counts', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nOrganize me.\n',
    }
    const result = applyMobileWorkspaceEditWithWrites({ ...base, notes: [editableNote, ...base.notes.slice(1)] }, {
      noteId: editableNote.id,
      organized: true,
      type: 'setOrganized',
    })
    const organizedNote = result.snapshot.notes.find((note) => note.id === editableNote.id)

    expect(organizedNote).toMatchObject({ organized: true })
    expect(organizedNote?.rawContent).toContain('_organized: true')
    expect(sidebarItems(result.snapshot, 'primary')).toEqual([
      expect.objectContaining({ count: '2', id: 'inbox' }),
      expect.objectContaining({ count: '0', id: 'tasks' }),
      expect.objectContaining({ count: '3', id: 'all-notes' }),
      expect.objectContaining({ count: '0', id: 'archive' }),
    ])
    expect(result.writes).toEqual([{
      content: expect.stringContaining('_organized: true'),
      kind: 'saveNote',
      path: organizedNote?.path,
    }])
  })

  it('keeps rebuilt Inbox counts empty when only organized or Type documents are active', () => {
    const base = workspaceScenarioForId('default')
    const organizedNote = {
      ...base.notes[0],
      archived: false,
      id: 'organized-note',
      organized: true,
      rawContent: '---\ntype: Essay\n_organized: true\n---\n# Organized\n',
      title: 'Organized',
      type: 'Essay',
    }
    const typeDocument = {
      ...base.notes[1],
      archived: false,
      id: 'type-document',
      organized: false,
      rawContent: '---\ntype: Type\n---\n# Type\n',
      title: 'Type',
      type: 'Type',
    }
    const archivedNote = {
      ...base.notes[2],
      archived: true,
      id: 'archived-note',
      organized: false,
      title: 'Archived',
      type: 'Essay',
    }

    const snapshot = applyMobileWorkspaceEdit({
      ...base,
      allNotes: [organizedNote, typeDocument, archivedNote],
      notes: [organizedNote, typeDocument, archivedNote],
      selectedNoteId: organizedNote.id,
    }, {
      noteId: organizedNote.id,
      organized: true,
      type: 'setOrganized',
    })

    expect(snapshot.noteListSubtitle).toBe('0 open notes')
    expect(sidebarItems(snapshot, 'primary')).toEqual([
      expect.objectContaining({ count: '0', id: 'inbox' }),
      expect.objectContaining({ count: '0', id: 'tasks' }),
      expect.objectContaining({ count: '2', id: 'all-notes' }),
      expect.objectContaining({ count: '1', id: 'archive' }),
    ])
  })

  it('deletes notes from the visible and complete note pools with a delete write', () => {
    const base = workspaceScenarioForId('default')
    const result = applyMobileWorkspaceEditWithWrites({ ...base, allNotes: base.notes }, {
      noteId: 'workflow-orchestration',
      type: 'deleteNote',
    })

    expect(result.snapshot.notes.some((candidate) => candidate.id === 'workflow-orchestration')).toBe(false)
    expect(result.snapshot.allNotes?.some((candidate) => candidate.id === 'workflow-orchestration')).toBe(false)
    expect(result.snapshot.selectedNoteId).not.toBe('workflow-orchestration')
    expect(result.writes).toEqual([{
      kind: 'deleteNote',
      path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    }])
  })

  it('hydrates metadata-only notes without creating a persistence write', () => {
    const base = workspaceScenarioForId('default')
    const metadataOnlyNote = {
      ...base.notes[1],
      editorBlocks: undefined,
      editorBullets: undefined,
      rawContent: undefined,
      snippet: 'Old metadata snippet',
    }
    const snapshot: MobileWorkspaceSnapshot = {
      ...base,
      allNotes: [base.notes[0], metadataOnlyNote],
      notes: [base.notes[0]],
      selectedNoteId: metadataOnlyNote.id,
    }

    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      noteId: metadataOnlyNote.id,
      rawContent: '# Hydrated Procedure\n\nFresh body with [[Workflow Orchestration Essay]].\n',
      type: 'hydrateNoteContent',
    })
    const hydrated = result.snapshot.allNotes?.find((note) => note.id === metadataOnlyNote.id)

    expect(result.writes).toEqual([])
    expect(hydrated).toMatchObject({
      rawContent: '# Hydrated Procedure\n\nFresh body with [[Workflow Orchestration Essay]].\n',
      snippet: 'Fresh body with Workflow Orchestration Essay.',
      title: 'Hydrated Procedure',
    })
    expect(hydrated?.editorBlocks?.[0]).toMatchObject({ kind: 'paragraph' })
  })

  it('does not inflate untouched metadata-only notes into fallback markdown after edits', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nOriginal body.\n',
    }
    const metadataOnlyNote = {
      ...base.notes[1],
      rawContent: undefined,
    }
    const snapshot: MobileWorkspaceSnapshot = {
      ...base,
      allNotes: [editableNote, metadataOnlyNote],
      notes: [editableNote],
      selectedNoteId: editableNote.id,
    }

    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      content: '# Workflow Orchestration Essay\n\nUpdated body.\n',
      noteId: editableNote.id,
      type: 'updateNoteContent',
    })

    expect(result.snapshot.allNotes?.find((note) => note.id === metadataOnlyNote.id)?.rawContent).toBeUndefined()
    expect(result.writes).toEqual([{
      content: '# Workflow Orchestration Essay\n\nUpdated body.\n',
      kind: 'saveNote',
      path: editableNote.path,
    }])
  })
})

describe('mobile wikilink editing helpers', () => {
  it('detects and replaces the trailing wikilink query', () => {
    const note = workspaceScenarioForId('default').notes[1]
    const content = '# Draft\n\nSee [[open'

    expect(trailingWikilinkQuery(content)).toBe('open')
    expect(replaceTrailingWikilinkQuery(content, 'open', note)).toBe(
      '# Draft\n\nSee [[Tolaria/Mobile UI/How I Run an Open Source Project]]',
    )
  })
})
