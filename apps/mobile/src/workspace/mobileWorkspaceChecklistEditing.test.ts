import { describe, expect, it } from 'vitest'
import { workspaceScenarios } from '../fixtures/workspaceFixtures'
import { applyMobileWorkspaceEditWithWrites } from './mobileWorkspaceEditing'
import { buildMobileTaskEntries } from './mobileTasks'
import type { MobileNote, MobileWorkspaceSnapshot } from './mobileWorkspaceModel'

const content = '---\ntype: Note\n---\n# Einkauf\n\n- [ ] Milch\n- [ ] Brot 📅 2026-11-02\n'

function snapshotWithNote(): { snapshot: MobileWorkspaceSnapshot; note: MobileNote } {
  const base = workspaceScenarios.default
  const note: MobileNote = { ...base.notes[0], rawContent: content, taskItems: [], type: 'Note' }
  return { note, snapshot: { ...base, notes: [note, ...base.notes.slice(1)], allNotes: undefined, selectedNoteId: note.id } }
}

describe('updateChecklistItem edit', () => {
  it('rewrites only the targeted checkbox, persists the note and refreshes the task list', () => {
    const { note, snapshot } = snapshotWithNote()
    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      checked: true, expectedText: 'Milch', line: 5, noteId: note.id, type: 'updateChecklistItem',
    })
    const next = result.snapshot.notes.find((candidate) => candidate.id === note.id)
    expect(next?.rawContent).toBe(content.replace('- [ ] Milch', '- [x] Milch'))
    expect(result.writes).toHaveLength(1)
    expect(result.writes[0]).toMatchObject({ kind: 'saveNote', content: next?.rawContent })
    expect(next?.taskItems?.map((item) => [item.text, item.checked])).toEqual([['Milch', true], ['Brot', false]])
    expect(buildMobileTaskEntries(result.snapshot.notes).filter((entry) => !entry.done).map((entry) => entry.title)).toContain('Brot')
  })

  it('moves a due date and leaves the note untouched when the line is stale', () => {
    const { note, snapshot } = snapshotWithNote()
    const moved = applyMobileWorkspaceEditWithWrites(snapshot, {
      due: '2026-11-20', expectedText: 'Brot', line: 6, noteId: note.id, type: 'updateChecklistItem',
    })
    expect(moved.snapshot.notes[0].rawContent).toContain('- [ ] Brot 📅 2026-11-20')

    const stale = applyMobileWorkspaceEditWithWrites(snapshot, {
      checked: true, expectedText: 'Gelöscht', line: 5, noteId: note.id, type: 'updateChecklistItem',
    })
    expect(stale.writes).toEqual([])
    expect(stale.snapshot.notes[0].rawContent).toBe(content)
  })
})
