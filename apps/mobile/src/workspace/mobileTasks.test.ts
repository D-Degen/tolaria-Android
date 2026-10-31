import { describe, expect, it } from 'vitest'
import {
  applyChecklistItemChange,
  buildMobileTaskEntries,
  extractChecklistItems,
  groupMobileTaskEntries,
  mobileShiftIsoDate,
  mobileTaskNoteDue,
  mobileTaskDueEdit,
  mobileTaskToggleEdit,
  normalizeDue,
} from './mobileTasks'
import type { MobileNote } from './mobileWorkspaceModel'

const doc = `---
type: Project
status: Active
---
# Plan

- [ ] APK bauen 📅 2026-11-02
- [x] Tests laufen lassen
  - [ ] Unteraufgabe eingerückt
* [X] Sternchen-Liste
1. [ ] Nummeriert

\`\`\`md
- [ ] im Codeblock zählt nicht
\`\`\`

- [ ] due:2026-12-24 Weihnachten
- nicht [ ] eine Checkbox
`

describe('extractChecklistItems', () => {
  const items = extractChecklistItems(doc)

  it('finds checkboxes of all list styles, skipping frontmatter and code fences', () => {
    expect(items.map((item) => item.text)).toEqual([
      'APK bauen',
      'Tests laufen lassen',
      'Unteraufgabe eingerückt',
      'Sternchen-Liste',
      'Nummeriert',
      'Weihnachten',
    ])
  })

  it('reads checked state and both due marker styles', () => {
    expect(items[0]).toMatchObject({ checked: false, due: '2026-11-02', line: 6 })
    expect(items[1]).toMatchObject({ checked: true, due: null })
    expect(items[3].checked).toBe(true)
    expect(items[5].due).toBe('2026-12-24')
  })

  it('parses German dates, calendar emojis and dataview/task formats from notes', () => {
    const raw = `
- [ ] German date 📅 31.10.2026
- [ ] Calendar emoji 🗓️ 2026-11-15
- [ ] Dataview syntax [due:: 2026-12-01]
- [ ] At-due syntax @due(2026-12-05)
- [ ] German with time 📅 07.11.2026 ⏰ 14:00
`
    const parsed = extractChecklistItems(raw)
    expect(parsed.map((item) => [item.text, item.due])).toEqual([
      ['German date', '2026-10-31'],
      ['Calendar emoji', '2026-11-15'],
      ['Dataview syntax', '2026-12-01'],
      ['At-due syntax', '2026-12-05'],
      ['German with time', '2026-11-07'],
    ])
  })
})

describe('applyChecklistItemChange', () => {
  it('toggles exactly one line and keeps everything else byte-identical', () => {
    const next = applyChecklistItemChange(doc, 6, 'APK bauen', { checked: true })
    const before = doc.split('\n')
    const after = next.split('\n')
    expect(after[6]).toBe('- [x] APK bauen 📅 2026-11-02')
    after.forEach((line, index) => { if (index !== 6) expect(line).toBe(before[index]) })
  })

  it('sets, replaces and removes the due marker', () => {
    const set = applyChecklistItemChange(doc, 7, 'Tests laufen lassen', { due: '2026-11-05' })
    expect(set.split('\n')[7]).toBe('- [x] Tests laufen lassen 📅 2026-11-05')
    const moved = applyChecklistItemChange(doc, 6, 'APK bauen', { due: '2026-11-09' })
    expect(moved.split('\n')[6]).toBe('- [ ] APK bauen 📅 2026-11-09')
    const cleared = applyChecklistItemChange(doc, 6, 'APK bauen', { due: null })
    expect(cleared.split('\n')[6]).toBe('- [ ] APK bauen')
  })

  it('normalizes due:YYYY-MM-DD markers to the calendar emoji when edited', () => {
    const line = doc.split('\n').findIndex((entry) => entry.includes('Weihnachten'))
    const next = applyChecklistItemChange(doc, line, 'Weihnachten', { checked: true })
    expect(next.split('\n')[line]).toBe('- [x] Weihnachten 📅 2026-12-24')
  })

  it('refuses stale edits when the line text changed or is not a checkbox', () => {
    expect(applyChecklistItemChange(doc, 6, 'Etwas anderes', { checked: true })).toBe(doc)
    expect(applyChecklistItemChange(doc, 5, 'Plan', { checked: true })).toBe(doc)
    expect(applyChecklistItemChange(doc, 999, 'x', { checked: true })).toBe(doc)
  })

  it('preserves CRLF line endings', () => {
    const crlf = '- [ ] a\r\n- [ ] b\r\n'
    expect(applyChecklistItemChange(crlf, 1, 'b', { checked: true })).toBe('- [ ] a\r\n- [x] b\r\n')
  })

  it('ignores invalid due values by clearing them instead of writing garbage', () => {
    expect(applyChecklistItemChange(doc, 6, 'APK bauen', { due: 'invalid-date' }).split('\n')[6]).toBe('- [ ] APK bauen')
    expect(applyChecklistItemChange(doc, 6, 'APK bauen', { due: '31.12.2026' }).split('\n')[6]).toBe('- [ ] APK bauen 📅 2026-12-31')
  })

  it('finds checkboxes when line index has drifted', () => {
    // line passed is 0, but 'APK bauen' is at line 6
    const updated = applyChecklistItemChange(doc, 0, 'APK bauen', { due: '2026-12-31' })
    expect(updated.split('\n')[6]).toBe('- [ ] APK bauen 📅 2026-12-31')
  })
})

describe('task entries (hybrid model)', () => {
  const base = { created: '', date: '', favorite: false, links: 0, modified: '', relationships: [], snippet: '', tags: [], typeTone: 'gray' as const, workspace: 'v' }
  const taskNote: MobileNote = {
    ...base,
    id: 't.md', title: 'Steuer', type: 'Task', status: 'open',
    properties: [{ key: 'Due', label: 'Due', value: '2026-11-01' }],
    taskItems: [
      { checked: false, due: null, line: 4, text: 'Belege sammeln' },
      { checked: false, due: '2026-10-30', line: 5, text: 'ELSTER' },
    ],
  }
  const plainNote: MobileNote = {
    ...base,
    id: 'n.md', title: 'Einkauf', type: 'Note', status: '',
    taskItems: [{ checked: false, due: null, line: 2, text: 'Milch' }, { checked: true, due: null, line: 3, text: 'Brot' }],
  }
  const doneTask: MobileNote = { ...base, id: 'd.md', title: 'Alt', type: 'task', status: 'Done' }
  const archived: MobileNote = { ...base, id: 'a.md', title: 'Archiv', type: 'Task', status: '', archived: true }

  it('lists Task notes and checkboxes of every note type, ignoring archived notes', () => {
    const entries = buildMobileTaskEntries([taskNote, plainNote, doneTask, archived])
    expect(entries.map((entry) => entry.id)).toEqual([
      'note:t.md', 'checkbox:t.md:4', 'checkbox:t.md:5', 'checkbox:n.md:2', 'checkbox:n.md:3', 'note:d.md',
    ])
    expect(entries.find((entry) => entry.id === 'note:t.md')).toMatchObject({ due: '2026-11-01', done: false })
    expect(entries.find((entry) => entry.id === 'note:d.md')?.done).toBe(true)
  })

  it('lets checkboxes of a Task note inherit its due date unless they have their own', () => {
    const entries = buildMobileTaskEntries([taskNote])
    expect(entries[1]).toMatchObject({ due: '2026-11-01', inheritedDue: true })
    expect(entries[2]).toMatchObject({ due: '2026-10-30', inheritedDue: false })
  })

  it('groups into overdue / today / upcoming / no date / done and sorts by due date', () => {
    const sections = groupMobileTaskEntries(buildMobileTaskEntries([taskNote, plainNote, doneTask]), '2026-11-01')
    expect(sections.map((section) => section.bucket)).toEqual(['overdue', 'today', 'noDate', 'done'])
    expect(sections[0].entries.map((entry) => entry.title)).toEqual(['ELSTER'])
    expect(sections[1].entries.map((entry) => entry.title)).toEqual(['Steuer', 'Belege sammeln'])
    expect(sections[3].entries.map((entry) => entry.title).sort()).toEqual(['Alt', 'Brot'])
  })
})

describe('date helpers', () => {
  it('reads due from property aliases and ignores non-dates', () => {
    expect(mobileTaskNoteDue({ properties: [{ key: 'deadline', label: '', value: '2026-03-04T10:00' }] })).toBe('2026-03-04')
    expect(mobileTaskNoteDue({ properties: [{ key: 'due', label: '', value: 'bald' }] })).toBeNull()
  })

  it('validates calendar dates and shifts across month ends', () => {
    expect(normalizeDue('2026-02-30')).toBeNull()
    expect(normalizeDue('2026-02-28')).toBe('2026-02-28')
    expect(mobileShiftIsoDate('2026-10-31', 1)).toBe('2026-11-01')
    expect(mobileShiftIsoDate('2026-12-31', 7)).toBe('2027-01-07')
  })
})

describe('task edits', () => {
  const [noteEntry, checkboxEntry] = buildMobileTaskEntries([{
    created: '', date: '', favorite: false, links: 0, modified: '', relationships: [], snippet: '', tags: [], typeTone: 'gray', workspace: 'v',
    id: 't.md', title: 'Steuer', type: 'Task', status: 'Open',
    properties: [{ key: 'Deadline', label: 'Deadline', value: '2026-11-01' }],
    taskItems: [{ checked: false, due: null, line: 4, text: 'Belege' }],
  }])

  it('toggles a Task note through its status and a checkbox through its line', () => {
    expect(mobileTaskToggleEdit(noteEntry)).toEqual({ key: 'status', noteId: 't.md', type: 'updateProperty', value: 'Done' })
    expect(mobileTaskToggleEdit({ ...noteEntry, done: true })).toMatchObject({ value: 'Open' })
    expect(mobileTaskToggleEdit(checkboxEntry)).toEqual({ checked: true, expectedText: 'Belege', line: 4, noteId: 't.md', type: 'updateChecklistItem' })
  })

  it('writes note due dates to the existing due property key and deletes it when cleared', () => {
    const note = { properties: [{ key: 'Deadline', label: 'Deadline', value: '2026-11-01' }] }
    expect(mobileTaskDueEdit(noteEntry, note, '2026-11-08')).toEqual({ key: 'Deadline', noteId: 't.md', type: 'updateProperty', value: '2026-11-08' })
    expect(mobileTaskDueEdit(noteEntry, note, null)).toEqual({ key: 'Deadline', noteId: 't.md', type: 'deleteProperty' })
    expect(mobileTaskDueEdit(noteEntry, undefined, '2026-11-08')).toMatchObject({ key: 'due' })
  })

  it('writes checkbox due dates inline and rejects invalid dates', () => {
    expect(mobileTaskDueEdit(checkboxEntry, undefined, '2026-11-08')).toEqual({ due: '2026-11-08', expectedText: 'Belege', line: 4, noteId: 't.md', type: 'updateChecklistItem' })
    expect(mobileTaskDueEdit(checkboxEntry, undefined, '2026-13-40')).toBeNull()
  })
})
