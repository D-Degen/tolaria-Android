import { describe, expect, it } from 'vitest'
import {
  executeSmartNoteAction,
  generateSmartNoteDraft,
  getSmartNotesStatus,
  localSuggestType,
} from './smartNotesEngine'

describe('smartNotesEngine', () => {
  const sampleNote = `
# Release Planung Tolaria Android

Heute besprechen wir die Veröffentlichung der neuen Version für alle Android-Geräte.
Die Performance auf Tablets und Handys muss stabil sein.

## Anforderungen
- [ ] APK Release Build testen
- [ ] Universal ABI Architektur verifizieren
TODO: Dokumentation für lokale KI aktualisieren
Wichtig: Floating Action Button z-index prüfen

Das Feature "Smart Notes" nutzt Gemini Nano auf unterstützten Geräten und läuft 100% offline.
`

  it('reports smart notes status with on-device capability', async () => {
    const status = await getSmartNotesStatus()
    expect(status.available).toBe(true)
    expect(status.engine).toBeDefined()
  })

  it('generates a concise summary', async () => {
    const result = await executeSmartNoteAction('summarize', sampleNote)
    expect(result.action).toBe('summarize')
    expect(result.text).toContain('-')
  })

  it('suggests a clean title', async () => {
    const result = await executeSmartNoteAction('suggestTitle', sampleNote)
    expect(result.action).toBe('suggestTitle')
    expect(result.text).toBe('Release Planung Tolaria Android')
  })

  it('extracts relevant tags', async () => {
    const result = await executeSmartNoteAction('generateTags', sampleNote)
    expect(result.action).toBe('generateTags')
    expect(result.items?.length).toBeGreaterThan(0)
    expect(result.items).toContain('anforderungen')
  })

  it('extracts all action items as checkboxes', async () => {
    const result = await executeSmartNoteAction('extractTodos', sampleNote)
    expect(result.action).toBe('extractTodos')
    expect(result.items).toEqual([
      '- [ ] APK Release Build testen',
      '- [ ] Universal ABI Architektur verifizieren',
      '- [ ] Dokumentation für lokale KI aktualisieren',
      '- [ ] Floating Action Button z-index prüfen',
    ])
  })

  it('handles empty note gracefully', async () => {
    const result = await executeSmartNoteAction('summarize', '')
    expect(result.text).toBe('')
  })

  it('generates a complete structured note draft with title, type, tags, and todos', async () => {
    const rawThought = `Meeting mit dem Mobile-Team zur neuen Release-Planung.
Wir müssen unbedingt die lokale KI für den Plus-Button einbauen.
TODO: APK auf Pixel 9 testen
Aufgabe: Dokumentation für Nutzer ergänzen`

    const draft = await generateSmartNoteDraft(rawThought, ['Note', 'Meeting', 'Project', 'Task'])
    expect(draft.title).toContain('Meeting mit dem Mobile-Team')
    expect(draft.type).toBe('Meeting')
    expect(draft.tags.length).toBeGreaterThan(0)
    expect(draft.todos).toEqual([
      '- [ ] APK auf Pixel 9 testen',
      '- [ ] Dokumentation für Nutzer ergänzen',
    ])
    expect(draft.markdownBody).toContain('## To-Dos')
    expect(draft.markdownBody).toContain('- [ ] APK auf Pixel 9 testen')
  })

  it('suggests the matching vault note type from input keywords', () => {
    expect(localSuggestType('Projekt Roadmap für Q4 planen', ['Note', 'Project', 'Meeting'])).toBe('Project')
    expect(localSuggestType('Neue Idee für das Dashboard', ['Note', 'Idea', 'Task'])).toBe('Idea')
    expect(localSuggestType('Einfacher Einkaufszettel', ['Note', 'Meeting'])).toBe('Note')
  })
})
