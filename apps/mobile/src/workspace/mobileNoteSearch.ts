import { mobileNoteDisplayLabels } from './mobileNoteDisplay'
import type { MobileNote, MobilePropertyDisplayMode, MobileTypeDefinitions } from './mobileWorkspaceModel'
import { fuzzyMatch } from '../../../../src/utils/fuzzyMatch'
import { slugifyNoteStem } from '../../../../src/utils/noteSlug'

type DisplayPropertyKey = string
type DisplayModeOverrides = Record<string, MobilePropertyDisplayMode>
type SearchQuery = string
type SearchText = string
type MobileNoteSearchCandidate = {
  exactRank: number
  fuzzyRank: number
  prefixRank: number
  value: SearchText
}

export type MobileNoteListSearchContext = {
  displayModes?: DisplayModeOverrides | null
  displayPropertyKeys?: DisplayPropertyKey[]
  typeDefinitions?: MobileTypeDefinitions
}
export type MobileNoteSearchMatch = {
  match: boolean
  rank: number
  score: number
}

const noMobileNoteSearchMatch: MobileNoteSearchMatch = {
  match: false,
  rank: Number.POSITIVE_INFINITY,
  score: 0,
}

export function normalizedMobileSearchQuery(value: SearchQuery) {
  return normalizeSearchText(value)
}

export function mobileNoteIdentitySearchText(note: MobileNote) {
  return normalizeSearchText([
    note.title,
    ...(note.aliases ?? []),
    noteFilename(note),
    noteFilenameStem(note),
    note.type,
    note.tags.join(' '),
    note.path ?? '',
  ].join(' '))
}

export function mobileNoteIdentityMatchesQuery(note: MobileNote, query: SearchQuery) {
  return mobileNoteIdentitySearchMatch(note, query).match
}

export function mobileNoteIdentitySearchMatch(note: MobileNote, query: SearchQuery): MobileNoteSearchMatch {
  const normalizedQuery = normalizedMobileSearchQuery(query)
  if (!normalizedQuery) {
    return {
      match: true,
      rank: 0,
      score: Number.MAX_SAFE_INTEGER,
    }
  }

  const queryForms = mobileSearchForms(normalizedQuery)
  const candidateMatch = mobileNoteIdentitySearchCandidates(note).reduce((best, candidate) => (
    betterMobileNoteSearchMatch(best, matchMobileNoteSearchCandidate(queryForms, candidate))
  ), noMobileNoteSearchMatch)
  if (candidateMatch.match) return candidateMatch

  const identityIndex = mobileNoteIdentitySearchText(note).indexOf(normalizedQuery)
  if (identityIndex === -1) return noMobileNoteSearchMatch

  return {
    match: true,
    rank: 5,
    score: -identityIndex,
  }
}

export function sortMobileNotesByIdentityMatch(notes: MobileNote[], query: SearchQuery): MobileNote[] {
  return notes
    .map((note, index) => ({
      index,
      match: mobileNoteIdentitySearchMatch(note, query),
      note,
    }))
    .filter(({ match }) => match.match)
    .sort((left, right) => (
      left.match.rank - right.match.rank ||
      right.match.score - left.match.score ||
      left.index - right.index
    ))
    .map(({ note }) => note)
}

const quickOpenSearchTextCache = new WeakMap<MobileNote, string>()
const noteListSearchTextCache = new WeakMap<MobileNote, Map<string, string>>()

export function mobileQuickOpenSearchText(note: MobileNote) {
  const cached = quickOpenSearchTextCache.get(note)
  if (cached !== undefined) return cached
  const normalized = normalizeSearchText([
    mobileNoteIdentitySearchText(note),
    note.snippet,
    note.status,
  ].join(' '))
  quickOpenSearchTextCache.set(note, normalized)
  return normalized
}

export function mobileNoteListMatchesQuery(
  note: MobileNote,
  query: SearchQuery,
  context: MobileNoteListSearchContext = {},
) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true

  return mobileNoteListSearchText(note, context).includes(normalizedQuery)
}

export function mobileNoteListSearchText(
  note: MobileNote,
  context: MobileNoteListSearchContext = {},
) {
  const { displayModes, displayPropertyKeys = [], typeDefinitions } = context
  const contextKey =
    displayPropertyKeys.join('\0') +
    (displayModes ? `|${Object.entries(displayModes).map(([k, v]) => `${k}:${v}`).join(',')}` : '') +
    (typeDefinitions ? `|td:${Object.keys(typeDefinitions).length}` : '')
  let perNoteCache = noteListSearchTextCache.get(note)
  const cached = perNoteCache?.get(contextKey)
  if (cached !== undefined) return cached

  const normalized = normalizeSearchText([
    note.title,
    note.snippet,
    ...mobileNoteDisplayLabels(note, displayPropertyKeys, typeDefinitions, displayModes),
  ].join(' '))

  if (!perNoteCache) {
    perNoteCache = new Map()
    noteListSearchTextCache.set(note, perNoteCache)
  }
  if (perNoteCache.size >= 8) {
    perNoteCache.clear()
  }
  perNoteCache.set(contextKey, normalized)
  return normalized
}

function normalizeSearchText(value: SearchText) {
  return value.normalize('NFKD').replace(/\p{Mark}/gu, '').trim().toLowerCase()
}

function mobileNoteIdentitySearchCandidates(note: MobileNote): MobileNoteSearchCandidate[] {
  const filename = noteFilename(note)

  return [
    { exactRank: 0, fuzzyRank: 4, prefixRank: 2, value: note.title },
    ...(note.aliases ?? []).map((value) => ({ exactRank: 1, fuzzyRank: 4, prefixRank: 3, value })),
    { exactRank: 1, fuzzyRank: 4, prefixRank: 3, value: filename },
    { exactRank: 1, fuzzyRank: 4, prefixRank: 3, value: filenameStem(filename) },
  ]
}

function matchMobileNoteSearchCandidate(
  queryForms: SearchText[],
  candidate: MobileNoteSearchCandidate,
): MobileNoteSearchMatch {
  return mobileSearchForms(candidate.value).reduce((best, target) => {
    let targetBest = best
    for (const queryForm of queryForms) {
      targetBest = betterMobileNoteSearchMatch(
        targetBest,
        matchMobileSearchForm(queryForm, target, candidate),
      )
    }

    return targetBest
  }, noMobileNoteSearchMatch)
}

function matchMobileSearchForm(
  queryForm: SearchText,
  target: SearchText,
  candidate: MobileNoteSearchCandidate,
): MobileNoteSearchMatch {
  if (target === queryForm) {
    return {
      match: true,
      rank: candidate.exactRank,
      score: Number.MAX_SAFE_INTEGER,
    }
  }
  if (target.startsWith(queryForm)) {
    return {
      match: true,
      rank: candidate.prefixRank,
      score: -target.length,
    }
  }

  const fuzzy = fuzzyMatch(queryForm, target)
  return fuzzy.match ? { ...fuzzy, rank: candidate.fuzzyRank } : noMobileNoteSearchMatch
}

function betterMobileNoteSearchMatch(
  left: MobileNoteSearchMatch,
  right: MobileNoteSearchMatch,
): MobileNoteSearchMatch {
  if (!right.match) return left
  if (!left.match) return right
  if (right.rank !== left.rank) return right.rank < left.rank ? right : left
  return right.score > left.score ? right : left
}

function mobileSearchForms(value: SearchText): SearchText[] {
  const normalized = normalizeSearchText(value)
  const withoutExtension = filenameStem(normalized)
  const slug = hasSearchToken(withoutExtension) ? slugifyNoteStem(withoutExtension) : ''

  return Array.from(new Set([normalized, withoutExtension, slug].filter(Boolean)))
}

function hasSearchToken(value: SearchText): boolean {
  return /\p{Letter}|\p{Number}/u.test(value)
}

function noteFilename(note: MobileNote) {
  return (note.path ?? note.id).split('/').at(-1) ?? note.id
}

function noteFilenameStem(note: MobileNote) {
  return filenameStem(noteFilename(note))
}

function filenameStem(value: SearchText) {
  return value.replace(/\.md$/iu, '')
}
