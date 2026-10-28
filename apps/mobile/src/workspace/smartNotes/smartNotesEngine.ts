import { optionalNativeSmartNotesModule } from '../../native/mobileSmartNotesNative'
import type { SmartNoteActionType, SmartNotesResult, SmartNotesStatus } from './smartNotesTypes'

export async function getSmartNotesStatus(): Promise<SmartNotesStatus> {
  const native = optionalNativeSmartNotesModule()
  if (native) {
    try {
      const res = await native.isAvailable()
      if (res.available) {
        return {
          available: true,
          engine: 'gemini-nano',
          model: res.model ?? 'Gemini Nano (AICore)',
        }
      }
    } catch {
      // Fallback to local on-device processing
    }
  }

  return {
    available: true,
    engine: 'local-on-device',
    model: 'Tolaria On-Device NLP',
  }
}

export async function executeSmartNoteAction(
  action: SmartNoteActionType,
  content: string,
): Promise<SmartNotesResult> {
  const trimmed = content.trim()
  if (!trimmed) {
    return {
      action,
      text: '',
      items: [],
    }
  }

  const native = optionalNativeSmartNotesModule()
  if (native) {
    try {
      switch (action) {
        case 'summarize': {
          const res = await native.summarize(trimmed)
          if (res) return { action, text: res }
          break
        }
        case 'suggestTitle': {
          const res = await native.suggestTitle(trimmed)
          if (res) return { action, text: res }
          break
        }
        case 'generateTags': {
          const res = await native.generateTags(trimmed)
          if (res && res.length > 0) return { action, text: res.join(', '), items: res }
          break
        }
        case 'extractTodos': {
          const res = await native.extractTodos(trimmed)
          if (res && res.length > 0) return { action, text: res.join('\n'), items: res }
          break
        }
      }
    } catch {
      // Fall through to deterministic on-device parser
    }
  }

  return executeLocalFallbackAction(action, trimmed)
}

export function executeLocalFallbackAction(
  action: SmartNoteActionType,
  content: string,
): SmartNotesResult {
  switch (action) {
    case 'summarize':
      return {
        action,
        text: localSummarize(content),
      }
    case 'suggestTitle':
      return {
        action,
        text: localSuggestTitle(content),
      }
    case 'generateTags': {
      const tags = localGenerateTags(content)
      return {
        action,
        text: tags.join(', '),
        items: tags,
      }
    }
    case 'extractTodos': {
      const todos = localExtractTodos(content)
      return {
        action,
        text: todos.join('\n'),
        items: todos,
      }
    }
  }
}

function localSummarize(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('---'))

  if (lines.length === 0) return 'Notiz enthält keine zusammenfassbaren Absätze.'

  const bullets: string[] = []
  for (const line of lines) {
    if (bullets.length >= 3) break
    const clean = line.replace(/^[-*•]\s+/, '').replace(/^\[[ xX]\]\s+/, '')
    if (clean.length > 15) {
      bullets.push(`- ${clean.slice(0, 120)}${clean.length > 120 ? '...' : ''}`)
    }
  }

  return bullets.length > 0
    ? bullets.join('\n')
    : `- ${lines[0].slice(0, 100)}`
}

function localSuggestTitle(text: string): string {
  // Check for H1 markdown title
  const h1Match = text.match(/^#\s+(.+)$/m)
  if (h1Match) {
    return h1Match[1].trim()
  }

  // First non-empty sentence or line
  const lines = text
    .split('\n')
    .map((l) => l.trim().replace(/^[#\-*•>]\s*/, ''))
    .filter((l) => l.length > 0 && !l.startsWith('---'))

  const firstLine = lines[0] ?? 'Neue Notiz'
  const firstSentence = firstLine.split(/[.!?]/)[0] ?? firstLine
  const words = firstSentence.split(/\s+/).slice(0, 6).join(' ')
  return words || 'Neue Notiz'
}

const COMMON_STOP_WORDS = new Set([
  'der', 'die', 'das', 'und', 'in', 'den', 'von', 'zu', 'mit', 'ist', 'für', 'auf', 'dem', 'des', 'ein', 'eine',
  'nicht', 'auch', 'es', 'an', 'als', 'wie', 'nach', 'im', 'über', 'the', 'and', 'to', 'of', 'a', 'in', 'for', 'is', 'on', 'that', 'with',
])

function localGenerateTags(text: string): string[] {
  // 1. Look for existing hashtags
  const hashtags = Array.from(text.matchAll(/#([a-zA-Z0-9_-]{2,25})/g)).map((m) => m[1].toLowerCase())

  // 2. Look for headings
  const headings = Array.from(text.matchAll(/^#{1,3}\s+([a-zA-Z0-9_\-\s]{3,30})/gm))
    .flatMap((m) => m[1].toLowerCase().split(/\s+/))
    .filter((w) => w.length > 3 && !COMMON_STOP_WORDS.has(w))

  const candidatePool = [...hashtags, ...headings]
  const unique = Array.from(new Set(candidatePool)).slice(0, 5)

  if (unique.length >= 2) return unique

  // Fallback: frequent words with length > 4
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !COMMON_STOP_WORDS.has(w))

  const counts = new Map<string, number>()
  for (const w of words) {
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 4)

  return Array.from(new Set([...unique, ...sorted])).slice(0, 4)
}

function localExtractTodos(text: string): string[] {
  const lines = text.split('\n')
  const results: string[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (/^[-*]\s+\[\s*\]/i.test(line)) {
      results.push(line.replace(/^\*\s+/, '- '))
    } else if (/^(todo|aufgabe|action|wichtig):\s*(.+)/i.test(line)) {
      const match = line.match(/^(todo|aufgabe|action|wichtig):\s*(.+)/i)
      if (match) {
        results.push(`- [ ] ${match[2]}`)
      }
    }
  }

  return results
}
