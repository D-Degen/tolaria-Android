import { optionalNativeSmartNotesModule } from '../../native/mobileSmartNotesNative'
import type { SmartNoteActionType, SmartNoteDraft, SmartNotesResult, SmartNotesStatus } from './smartNotesTypes'
import {
  extractUrlsFromText,
  grabUrlContent,
  type GrabbedUrlContent,
} from './urlContentGrabber'

let pendingSharedText: string | null = null
let pendingAutoStartVoice = false

export function requestAutoStartVoiceInput(): void {
  pendingAutoStartVoice = true
}

export function takePendingAutoStartVoiceInput(): boolean {
  const current = pendingAutoStartVoice
  pendingAutoStartVoice = false
  return current
}

export async function startNativeVoiceRecognition(): Promise<string | null> {
  const native = optionalNativeSmartNotesModule()
  if (!native?.recognizeSpeech) return null
  try {
    const result = await native.recognizeSpeech()
    const trimmed = result?.trim() ?? ''
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}

export function isNoteOnlyLink(text: string): boolean {
  const cleaned = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^#\s+/.test(line))
    .join(' ')
    .trim()

  if (!cleaned) return false
  const { firstUrl, userNotes } = extractUrlsFromText(cleaned)
  if (!firstUrl) return false
  const remaining = userNotes.replace(/^[[\]()<>'"-\s•*]+|[[\]()<>'"-\s•*]+$/g, '').trim()
  return remaining.length === 0
}

export async function consumeIncomingSharedText(): Promise<string | null> {
  const native = optionalNativeSmartNotesModule()
  if (!native?.consumeSharedText) return null
  try {
    const shared = await native.consumeSharedText()
    const trimmed = shared?.trim() ?? ''
    if (trimmed.length > 0) {
      pendingSharedText = trimmed
      return trimmed
    }
  } catch {
    // Ignore native intent read errors
  }
  return null
}

export function takePendingSharedText(): string | null {
  const current = pendingSharedText
  pendingSharedText = null
  return current
}

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

  if (action === 'analyzeLink') {
    const { firstUrl, userNotes } = extractUrlsFromText(trimmed)
    if (!firstUrl) {
      return {
        action: 'analyzeLink',
        text: 'Kein gültiger Link (http:// oder https://) in dieser Notiz gefunden.',
        items: [],
      }
    }
    const grabbed = await grabUrlContent(firstUrl)
    const draft = await generateUrlSmartNoteDraft(grabbed, userNotes, ['Note'])
    return {
      action: 'analyzeLink',
      text: draft.markdownBody,
      items: draft.tags,
      draft,
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
    case 'analyzeLink': {
      const { firstUrl } = extractUrlsFromText(content)
      return {
        action,
        text: firstUrl
          ? `> 🔗 **Web-Quelle:** ${firstUrl}`
          : 'Kein gültiger Link in dieser Notiz gefunden.',
        items: [],
      }
    }
  }
}

function localSummarize(text: string): string {
  const rawLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('---'))

  if (rawLines.length === 0) return 'Notiz enthält keine zusammenfassbaren Absätze.'

  const candidateSegments: string[] = []
  for (const line of rawLines) {
    if (line.length > 220) {
      const sentences = line
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 25)
      if (sentences.length > 1) {
        candidateSegments.push(...sentences)
        continue
      }
      // For unpunctuated auto-captions, split into ~140-char chunks at word boundaries
      const words = line.split(/\s+/)
      let chunk = ''
      for (const word of words) {
        if (`${chunk} ${word}`.trim().length > 130) {
          if (chunk.trim().length > 25) candidateSegments.push(chunk.trim())
          chunk = word
        } else {
          chunk = `${chunk} ${word}`.trim()
        }
      }
      if (chunk.trim().length > 25) candidateSegments.push(chunk.trim())
    } else {
      candidateSegments.push(line)
    }
  }

  const bullets: string[] = []
  const step = candidateSegments.length > 6 ? Math.max(1, Math.floor(candidateSegments.length / 4)) : 1
  for (let i = 0; i < candidateSegments.length && bullets.length < 4; i += step) {
    const clean = candidateSegments[i]
      .replace(/^[-*•]\s+/, '')
      .replace(/^\[[ xX]\]\s+/, '')
      .replace(/^(?:Video-Transkript|Transkript|Video-Beschreibung):\s*/i, '')
      .trim()
    if (clean.length > 15) {
      bullets.push(`- ${clean.slice(0, 140)}${clean.length > 140 ? '…' : ''}`)
    }
  }

  return bullets.length > 0
    ? bullets.join('\n')
    : `- ${rawLines[0].slice(0, 120)}`
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

export async function generateSmartNoteDraft(
  rawInput: string,
  availableTypes: string[] = ['Note'],
): Promise<SmartNoteDraft> {
  const trimmed = rawInput.trim()
  const normalizedTypes = availableTypes.length > 0 ? availableTypes : ['Note']

  if (!trimmed) {
    return {
      title: 'Neue Notiz',
      type: normalizedTypes[0] ?? 'Note',
      tags: [],
      todos: [],
      markdownBody: '',
      engine: 'local-on-device',
    }
  }

  const { firstUrl, userNotes } = extractUrlsFromText(trimmed)
  if (firstUrl) {
    const grabbed = await grabUrlContent(firstUrl)
    return generateUrlSmartNoteDraft(grabbed, userNotes, normalizedTypes)
  }

  const native = optionalNativeSmartNotesModule()
  if (native) {
    try {
      if (typeof native.generateStructuredNote === 'function') {
        const rawStructured = await native.generateStructuredNote(trimmed, normalizedTypes)
        const parsed = parseStructuredNoteResponse(rawStructured, trimmed, normalizedTypes)
        if (parsed) return parsed
      }

      const [title, tags, todos, summary] = await Promise.all([
        native.suggestTitle(trimmed),
        native.generateTags(trimmed),
        native.extractTodos(trimmed),
        native.summarize(trimmed),
      ])

      if (title || (tags && tags.length > 0) || summary) {
        const finalTitle = (title || localSuggestTitle(trimmed)).trim()
        const finalTags = tags && tags.length > 0 ? tags : localGenerateTags(trimmed)
        const finalTodos = todos && todos.length > 0 ? todos : localExtractTodos(trimmed)
        const finalType = localSuggestType(trimmed, normalizedTypes)
        const markdownBody = buildStructuredMarkdownBody(trimmed, summary, finalTodos)
        return {
          title: finalTitle,
          type: finalType,
          tags: finalTags,
          todos: finalTodos,
          markdownBody,
          engine: 'gemini-nano',
        }
      }
    } catch {
      // Fall back to deterministic on-device structuring
    }
  }

  return generateLocalSmartNoteDraft(trimmed, normalizedTypes)
}

export function generateLocalSmartNoteDraft(
  rawInput: string,
  availableTypes: string[] = ['Note'],
): SmartNoteDraft {
  const trimmed = rawInput.trim()
  const normalizedTypes = availableTypes.length > 0 ? availableTypes : ['Note']
  const title = localSuggestTitle(trimmed)
  const type = localSuggestType(trimmed, normalizedTypes)
  const tags = localGenerateTags(trimmed)
  const todos = localExtractTodos(trimmed)
  const summary = trimmed.length > 180 ? localSummarize(trimmed) : ''
  const markdownBody = buildStructuredMarkdownBody(trimmed, summary, todos)

  return {
    title,
    type,
    tags,
    todos,
    markdownBody,
    engine: 'local-on-device',
  }
}

function parseStructuredNoteResponse(
  rawResponse: string,
  fallbackInput: string,
  availableTypes: string[],
): SmartNoteDraft | null {
  const cleaned = rawResponse.trim()
  if (!cleaned) return null

  const titleMatch = cleaned.match(/^TITLE:\s*(.+)$/im)
  const typeMatch = cleaned.match(/^TYPE:\s*(.+)$/im)
  const tagsMatch = cleaned.match(/^TAGS:\s*(.+)$/im)
  const todosSectionMatch = cleaned.match(/TODOS:\s*([\s\S]*?)(?=\nBODY:|$)/i)
  const bodySectionMatch = cleaned.match(/BODY:\s*([\s\S]*)$/i)

  if (!titleMatch && !bodySectionMatch) return null

  const title = titleMatch?.[1]?.trim()?.replace(/^["']|["']$/g, '') || localSuggestTitle(fallbackInput)
  const rawType = typeMatch?.[1]?.trim() ?? ''
  const matchedType = availableTypes.find((t) => t.toLowerCase() === rawType.toLowerCase())
    ?? localSuggestType(fallbackInput, availableTypes)

  const tags = tagsMatch?.[1]
    ? tagsMatch[1]
        .split(',')
        .map((t) => t.trim().replace(/^#/, '').toLowerCase())
        .filter((t) => t.length > 0)
    : localGenerateTags(fallbackInput)

  const todos = todosSectionMatch?.[1]
    ? todosSectionMatch[1]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('- [ ]') || line.startsWith('- [x]'))
    : localExtractTodos(fallbackInput)

  const rawBody = bodySectionMatch?.[1]?.trim() || fallbackInput
  const markdownBody = appendTodosIfMissing(rawBody, todos)

  return {
    title,
    type: matchedType,
    tags,
    todos,
    markdownBody,
    engine: 'gemini-nano',
  }
}

export function localSuggestType(text: string, availableTypes: string[]): string {
  const normalizedTypes = availableTypes.length > 0 ? availableTypes : ['Note']
  const lower = text.toLowerCase()

  const typeKeywordMap: Array<{ keywords: string[]; patterns: RegExp[] }> = [
    {
      keywords: ['meeting', 'besprechung', 'call', 'sync', 'jour fixe', 'protokoll', 'teilnehmer', 'agenda'],
      patterns: [/meeting/i, /besprechung/i, /protokoll/i, /call/i],
    },
    {
      keywords: ['projekt', 'project', 'roadmap', 'meilenstein', 'milestone', 'release', 'sprint', 'architektur'],
      patterns: [/project/i, /projekt/i],
    },
    {
      keywords: ['todo', 'aufgabe', 'task', 'checkliste', 'erledigen', 'deadline', 'frist', '- [ ]'],
      patterns: [/task/i, /todo/i, /aufgabe/i],
    },
    {
      keywords: ['idee', 'idea', 'brainstorming', 'konzept', 'vorschlag', 'inspiration', 'entwurf'],
      patterns: [/idea/i, /idee/i, /note/i],
    },
    {
      keywords: ['person', 'kontakt', 'team', 'kunde', 'partner'],
      patterns: [/person/i, /contact/i, /kontakt/i],
    },
    {
      keywords: ['youtube.com', 'youtu.be', 'video', 'podcast', 'vortrag', 'talk'],
      patterns: [/video/i, /media/i, /bookmark/i, /resource/i, /link/i, /idea/i],
    },
    {
      keywords: ['http://', 'https://', 'artikel', 'article', 'blog', 'quelle', 'webseite'],
      patterns: [/bookmark/i, /article/i, /artikel/i, /link/i, /resource/i, /research/i, /idea/i],
    },
  ]

  // 1. Direct mention of an available type name in text
  for (const candidate of normalizedTypes) {
    if (candidate.toLowerCase() !== 'note' && lower.includes(candidate.toLowerCase())) {
      return candidate
    }
  }

  // 2. Semantic keyword matching against available vault types
  for (const rule of typeKeywordMap) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      for (const pattern of rule.patterns) {
        const match = normalizedTypes.find((t) => pattern.test(t))
        if (match) return match
      }
    }
  }

  return normalizedTypes.find((t) => t.toLowerCase() === 'note') ?? normalizedTypes[0] ?? 'Note'
}

function buildStructuredMarkdownBody(
  rawInput: string,
  summary: string,
  todos: string[],
): string {
  const lines = rawInput
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, arr) => !(index === 0 && /^#\s+/.test(line.trim())) || arr.length === 1)

  const cleanedBody = lines.join('\n').trim()
  const sections: string[] = []

  if (summary && summary.trim().length > 0 && cleanedBody.length > 180) {
    sections.push(`> **KI-Zusammenfassung:**\n> ${summary.trim().replace(/\n/g, '\n> ')}`)
  }

  if (cleanedBody) {
    sections.push(cleanedBody)
  }

  return appendTodosIfMissing(sections.join('\n\n'), todos)
}

function appendTodosIfMissing(body: string, todos: string[]): string {
  if (todos.length === 0) return body
  const missingTodos = todos.filter((todo) => {
    const taskText = todo.replace(/^- \[[ xX]\]\s*/, '').trim()
    return taskText.length > 0 && !body.includes(`- [ ] ${taskText}`)
  })
  if (missingTodos.length === 0) return body
  return `${body}\n\n## To-Dos\n${missingTodos.join('\n')}`.trim()
}

async function generateUrlSmartNoteDraft(
  grabbed: GrabbedUrlContent,
  userNotes: string,
  availableTypes: string[],
): Promise<SmartNoteDraft> {
  const sourceHeader = formatGrabbedSourceHeader(grabbed)
  const analysisSourceText = [
    `Titel: ${grabbed.title}`,
    grabbed.author ? `Autor/Kanal: ${grabbed.author}` : '',
    grabbed.description ? `Beschreibung: ${grabbed.description}` : '',
    grabbed.bodyText ? `Inhalt:\n${grabbed.bodyText}` : '',
    userNotes ? `Eigene Notizen:\n${userNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const native = optionalNativeSmartNotesModule()
  if (native && (grabbed.fetched || userNotes.length > 0)) {
    try {
      const [aiSummary, aiTags, aiTodos] = await Promise.all([
        native.summarize(analysisSourceText),
        native.generateTags(analysisSourceText),
        native.extractTodos(analysisSourceText),
      ])

      if (aiSummary || (aiTags && aiTags.length > 0)) {
        const mergedTags = Array.from(
          new Set([...grabbed.keywords, ...(aiTags ?? []), ...localGenerateTags(analysisSourceText)]),
        ).slice(0, 6)
        const finalTodos =
          aiTodos && aiTodos.length > 0 ? aiTodos : localExtractTodos(analysisSourceText)
        const markdownBody = buildGrabbedUrlMarkdownBody({
          grabbed,
          sourceHeader,
          summary: aiSummary || localSummarizeUrlContent(grabbed, userNotes),
          userNotes,
          todos: finalTodos,
        })

        return {
          title: grabbed.title || localSuggestTitle(analysisSourceText),
          type: suggestUrlNoteType(grabbed, availableTypes, analysisSourceText),
          tags: mergedTags,
          todos: finalTodos,
          markdownBody,
          engine: 'gemini-nano',
        }
      }
    } catch {
      // Fallback to local on-device URL structuring
    }
  }

  const localTags = Array.from(
    new Set([...grabbed.keywords, ...localGenerateTags(analysisSourceText)]),
  ).slice(0, 6)
  const localTodos = localExtractTodos(analysisSourceText)
  const localSummary = localSummarizeUrlContent(grabbed, userNotes)
  const markdownBody = buildGrabbedUrlMarkdownBody({
    grabbed,
    sourceHeader,
    summary: localSummary,
    userNotes,
    todos: localTodos,
  })

  return {
    title: grabbed.title || localSuggestTitle(analysisSourceText),
    type: suggestUrlNoteType(grabbed, availableTypes, analysisSourceText),
    tags: localTags,
    todos: localTodos,
    markdownBody,
    engine: 'local-on-device',
  }
}

function suggestUrlNoteType(
  grabbed: GrabbedUrlContent,
  availableTypes: string[],
  analysisSourceText: string,
): string {
  const patterns =
    grabbed.kind === 'youtube'
      ? [/video/i, /media/i, /bookmark/i, /resource/i, /link/i]
      : [/article/i, /artikel/i, /bookmark/i, /resource/i, /link/i, /research/i]

  for (const pattern of patterns) {
    const match = availableTypes.find((t) => pattern.test(t))
    if (match) return match
  }
  return localSuggestType(`${grabbed.title} ${analysisSourceText}`, availableTypes)
}

function formatGrabbedSourceHeader(grabbed: GrabbedUrlContent): string {
  const icon =
    grabbed.kind === 'youtube'
      ? '🎬'
      : grabbed.kind === 'repository'
        ? '💻'
        : grabbed.kind === 'article'
          ? '📰'
          : '🔗'
  const label =
    grabbed.kind === 'youtube'
      ? 'YouTube-Video'
      : grabbed.kind === 'repository'
        ? 'Repository'
        : grabbed.kind === 'article'
          ? 'Artikel'
          : 'Web-Quelle'

  const metaParts = [
    grabbed.siteName && grabbed.siteName.toLowerCase() !== grabbed.kind ? grabbed.siteName : grabbed.domain,
    grabbed.author ? `Autor/Kanal: ${grabbed.author}` : '',
    grabbed.duration ? `Dauer: ${grabbed.duration}` : '',
  ].filter(Boolean)

  return [
    `> ${icon} **${label}:** [${grabbed.title}](${grabbed.url})`,
    metaParts.length > 0 ? `> ${metaParts.join(' • ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function localSummarizeUrlContent(grabbed: GrabbedUrlContent, userNotes: string): string {
  const sourcePool = [
    grabbed.transcript ?? '',
    grabbed.description,
    grabbed.bodyText,
    userNotes,
  ]
    .filter(Boolean)
    .join('\n')

  if (!sourcePool.trim()) {
    return `- Gespeicherter Link von **${grabbed.domain}** (${grabbed.url})`
  }
  return localSummarize(sourcePool)
}

function buildGrabbedUrlMarkdownBody({
  grabbed,
  sourceHeader,
  summary,
  userNotes,
  todos,
}: {
  grabbed: GrabbedUrlContent
  sourceHeader: string
  summary: string
  userNotes: string
  todos: string[]
}): string {
  const sections: string[] = [sourceHeader]

  if (userNotes.trim()) {
    sections.push(`## Eigene Notizen\n${userNotes.trim()}`)
  }

  if (summary.trim()) {
    sections.push(`## Kernaussagen (KI-Analyse)\n${summary.trim()}`)
  }

  if (grabbed.chapters.length > 0) {
    const chapterLines = grabbed.chapters.map((ch) => `- \`${ch.timestamp}\` – ${ch.title}`)
    sections.push(`## Kapitel & Zeitstempel\n${chapterLines.join('\n')}`)
  }

  if (grabbed.transcript?.trim()) {
    const transcriptSnippet =
      grabbed.transcript.trim().length > 1_600
        ? `${grabbed.transcript.trim().slice(0, 1_600).trimEnd()}…`
        : grabbed.transcript.trim()
    sections.push(`## Video-Transkript\n${transcriptSnippet}`)
  }

  const detailText = grabbed.description || (!grabbed.transcript ? grabbed.bodyText : '')
  if (detailText && detailText.trim().length > 0) {
    const previewSnippet =
      detailText.trim().length > 900
        ? `${detailText.trim().slice(0, 900).trimEnd()}…`
        : detailText.trim()
    sections.push(`## Auszug & Beschreibung\n${previewSnippet}`)
  }

  return appendTodosIfMissing(sections.join('\n\n'), todos)
}


