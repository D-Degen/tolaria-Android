import {
  frontmatterFlag,
  frontmatterList,
  frontmatterProperties,
  frontmatterRelationships,
  frontmatterScalar,
  parseLocalVaultDocument,
  type LocalVaultFrontmatter,
} from './localVaultFrontmatter'
import {
  deriveLocalVaultTitle,
  localVaultEditorBlocks,
  localVaultEditorBullets,
  localVaultOutgoingLinks,
  localVaultSnippet,
} from './localVaultMarkdown'
import {
  orderedMobileSavedViews,
  parseMobileSavedViewFile,
} from './mobileSavedViews'
import { buildMobileSidebarSections } from './mobileSidebarSections'
import { isMobileInboxNote } from './mobileNoteFilters'
import { extractChecklistItems } from './mobileTasks'
import { normalizeMobileNoteWidth } from './mobileNoteWidth'
import { normalizeMobileWikilinkTarget } from './mobileWikilinks'
import { mobileWorkspaceAlias } from './mobileWorkspaceAlias'
import {
  mobileAllNotesFileVisibilityFromVaultConfig,
  mobileNoteListPropertyOverridesFromVaultConfig,
  normalizeMobileVaultConfig,
} from './mobileVaultConfig'
import type {
  MobileFileKind,
  MobileNote,
  MobileNoteWidth,
  MobileProperty,
  MobilePropertyValue,
  MobileRelationship,
  MobileRelationshipValue,
  MobileSavedView,
  MobileTone,
  MobileTypeDefinition,
  MobileTypeDefinitions,
  MobileVaultConfig,
  MobileWorkspaceSnapshot,
} from './mobileWorkspaceModel'
import { relationshipKindForKey } from '../../../../src/utils/relationshipKeys'
import { absoluteDate, noteListSubtitle, relativeDate } from './localVaultPresentation'
import { localVaultFileKind, parseNonMarkdownVaultEntry } from './localVaultFileKinds'
export { mobileFileKindForPath } from './localVaultFileKinds'

type AbsoluteVaultPath = string
type LocalVaultLabel = string
type NoteId = string
type NoteTitle = string
type NoteTypeName = string
type RelationshipLabel = string
type RelativeVaultPath = string
type TimestampMs = number
type VaultRootPath = string
type WikilinkTarget = string

export type LocalVaultFile = {
  absolutePath: AbsoluteVaultPath
  content: string
  contentDigest?: string
  createdAt: TimestampMs | null
  fileKind?: MobileFileKind
  modifiedAt: TimestampMs | null
  relativePath: RelativeVaultPath
  size: number
}

export type LocalVaultSnapshotOptions = {
  folderPaths?: RelativeVaultPath[]
  files: LocalVaultFile[]
  maxNotes?: number
  vaultConfig?: MobileVaultConfig | null
  vaultAlias?: string | null
  vaultLabel: LocalVaultLabel
  vaultPath: VaultRootPath
}

export type LocalVaultEntry = {
  archived: boolean
  aliases: string[]
  body: string
  createdAt: TimestampMs | null
  favorite: boolean
  favoriteIndex: number | null
  fileKind: MobileFileKind
  filename: string
  id: NoteId
  icon: string | null
  links: number
  modifiedAt: TimestampMs | null
  noteWidth: MobileNoteWidth | null
  organized: boolean
  outgoingLinks: string[]
  path: RelativeVaultPath
  properties: MobileProperty[]
  rawContent: string
  relationships: Record<RelationshipLabel, WikilinkTarget[]>
  status: string
  tags: string[]
  title: NoteTitle
  type: NoteTypeName
  typeDefinition: MobileTypeDefinition
  typeDefinitionTone: MobileTone
  typeTone: MobileTone
}

type RelationshipResolver = (target: WikilinkTarget) => LocalVaultEntry | null
type MobileNoteDetailLevel = 'editable' | 'summary'
type SnapshotFrontmatterValues = Map<string, unknown>

const DEFAULT_MAX_NOTES = 80
const snapshotFrontmatterValueCache = new WeakMap<LocalVaultFrontmatter, SnapshotFrontmatterValues>()
const snapshotFrontmatterLookupKeyCache = new Map<string, string>()

export function buildLocalVaultWorkspaceSnapshot(options: LocalVaultSnapshotOptions): MobileWorkspaceSnapshot {
  const work = localVaultWorkspaceSnapshotSteps(options)
  let step = work.next()
  while (!step.done) step = work.next()
  return step.value
}

export function* localVaultWorkspaceSnapshotSteps(options: LocalVaultSnapshotOptions): Generator<void, MobileWorkspaceSnapshot> {
  const { files, maxNotes = DEFAULT_MAX_NOTES, vaultAlias, vaultConfig, vaultLabel, vaultPath } = options
  const workspaceAlias = mobileWorkspaceAlias({ alias: vaultAlias, label: vaultLabel, path: vaultPath })
  const workspaceIdentity = { alias: workspaceAlias, label: vaultLabel }
  const parsedEntries = yield* mapSnapshotItems(files, parseLocalVaultEntry)
  const entries = applyTypeDefinitionTones(parsedEntries)
  yield
  const typeDefinitions = localTypeDefinitions(entries)
  yield
  const allNoteEntries = [...entries].sort(compareByModifiedDate)
  const visibleEntries = visibleNoteEntries(entries)
  const selectedEntries = visibleEntries.slice(0, maxNotes)
  const resolveRelationship = yield* relationshipResolver(entries, workspaceAlias)
  yield
  const allNotes = yield* mapSnapshotItems(allNoteEntries, (entry) => localEntryToMobileNote(entry, resolveRelationship, workspaceIdentity, 'summary'))
  const notes = yield* mapSnapshotItems(selectedEntries, (entry) => localEntryToMobileNote(entry, resolveRelationship, workspaceIdentity, 'editable'))
  const parsedViews = yield* mapSnapshotItems(files, parseViewFile)
  const views = orderedMobileSavedViews(parsedViews.filter(isMobileSavedView))
  yield
  return assembleLocalVaultSnapshot({
    allNotes, entries, notes, options, typeDefinitions, views, workspaceAlias,
    visibleCount: visibleEntries.length, normalizedVaultConfig: normalizeMobileVaultConfig(vaultConfig),
  })
}

function* mapSnapshotItems<Value, Result>(values: readonly Value[], convert: (value: Value, index: number) => Result): Generator<void, Result[]> {
  const result: Result[] = []
  let index = 0
  for (const value of values) { result.push(convert(value, index++)); yield }
  return result
}

type LocalVaultSnapshotState = {
  allNotes: MobileNote[]
  entries: LocalVaultEntry[]
  notes: MobileNote[]
  normalizedVaultConfig: MobileVaultConfig
  options: LocalVaultSnapshotOptions
  typeDefinitions: MobileTypeDefinitions
  views: MobileSavedView[]
  visibleCount: number
  workspaceAlias: string | null
}

function assembleLocalVaultSnapshot(state: LocalVaultSnapshotState): MobileWorkspaceSnapshot {
  const { allNotes, entries, notes, normalizedVaultConfig, options, typeDefinitions, views, visibleCount, workspaceAlias } = state
  const { folderPaths = [], vaultLabel, vaultPath } = options
  return {
    allNotes,
    editorBlocks: notes[0]?.editorBlocks ?? [],
    editorBullets: notes[0]?.editorBullets ?? [],
    noteListSubtitle: noteListSubtitle(notes.length, visibleCount),
    noteListPropertyOverrides: mobileNoteListPropertyOverridesFromVaultConfig(normalizedVaultConfig),
    notes,
    selectedNoteId: notes[0]?.id,
    folderPaths,
    sidebarSections: buildMobileSidebarSections({
      allNotesFileVisibility: mobileAllNotesFileVisibilityFromVaultConfig(normalizedVaultConfig),
      folderPaths,
      notes: allNotes,
      typeDefinitions,
      views,
    }),
    source: {
      alias: workspaceAlias,
      kind: 'localVault',
      label: vaultLabel,
      totalNotes: entries.length,
      vaultPath,
      visibleNotes: notes.length,
    },
    sync: { kind: 'synced', minutesAgo: 0 },
    typeDefinitions,
    vaultConfig: normalizedVaultConfig,
    views,
  }
}

function applyTypeDefinitionTones(entries: LocalVaultEntry[]): LocalVaultEntry[] {
  const tones = new Map(
    entries
      .filter(isActiveTypeEntry)
      .map((entry) => [entry.title, entry.typeDefinitionTone]),
  )

  return entries.map((entry) => {
    if (entry.type === 'Type') return entry
    return {
      ...entry,
      typeTone: tones.get(entry.type) ?? entry.typeTone,
    }
  })
}

function parseLocalVaultEntry(file: LocalVaultFile): LocalVaultEntry {
  const fileKind = localVaultFileKind(file)
  return fileKind === 'markdown'
    ? parseMarkdownVaultEntry(file, fileKind)
    : parseNonMarkdownVaultEntry(file, fileKind)
}

function parseMarkdownVaultEntry(file: LocalVaultFile, fileKind: MobileFileKind): LocalVaultEntry {
  const document = parseLocalVaultDocument(file.content)
  const filename = file.relativePath.split('/').at(-1) ?? file.relativePath
  const type = cleanTypeName(frontmatterScalar(document.frontmatter, ['type', 'Is A', 'is_a']) ?? 'Note')
  const color = frontmatterScalar(document.frontmatter, ['color', '_color'])
  const outgoingLinks = localVaultOutgoingLinks(document.body)
  const title = deriveLocalVaultTitle({
    body: document.body,
    fallbackTitle: frontmatterScalar(document.frontmatter, ['title']),
    filename,
  })

  return {
    archived: frontmatterFlag(document.frontmatter, ['_archived', 'Archived', 'archived']),
    aliases: frontmatterList(document.frontmatter, ['aliases', 'Aliases']),
    body: document.body,
    createdAt: file.createdAt,
    favorite: frontmatterFlag(document.frontmatter, ['_favorite', 'favorite']),
    favoriteIndex: frontmatterNumber(document.frontmatter, ['_favorite_index', 'favorite_index', 'favorite index']),
    fileKind,
    filename,
    id: file.relativePath,
    icon: frontmatterText(document.frontmatter, ['_icon', 'icon']),
    links: outgoingLinks.length,
    modifiedAt: file.modifiedAt,
    noteWidth: normalizeMobileNoteWidth(frontmatterScalar(document.frontmatter, ['_width', 'width'])),
    organized: frontmatterFlag(document.frontmatter, ['_organized']),
    outgoingLinks,
    path: file.relativePath,
    properties: mobileProperties(frontmatterProperties(document.frontmatter)),
    rawContent: file.content,
    relationships: frontmatterRelationships(document.frontmatter),
    status: frontmatterScalar(document.frontmatter, ['Status', 'status']) ?? '',
    tags: frontmatterList(document.frontmatter, ['tags', 'Tags']),
    title,
    type,
    typeDefinition: typeDefinitionFromFrontmatter(document.frontmatter),
    typeDefinitionTone: toneFromDesktopColor(color, title),
    typeTone: toneFromDesktopColor(null, type),
  }
}


function typeDefinitionFromFrontmatter(frontmatter: LocalVaultFrontmatter): MobileTypeDefinition {
  return {
    color: frontmatterText(frontmatter, ['color', '_color']),
    icon: frontmatterText(frontmatter, ['_icon', 'icon']),
    label: frontmatterText(frontmatter, ['_sidebar_label', 'sidebar_label', 'sidebar label']),
    listPropertiesDisplay: frontmatterList(frontmatter, [
      '_list_properties_display',
      'list_properties_display',
      'listPropertiesDisplay',
    ]),
    order: frontmatterNumber(frontmatter, ['_order', 'order']),
    properties: mobileTypeDefinitionProperties(frontmatter),
    relationships: frontmatterRelationships(frontmatter),
    sort: frontmatterText(frontmatter, ['_sort', 'sort']),
    template: frontmatterText(frontmatter, ['template']),
    view: frontmatterText(frontmatter, ['view']),
    visible: frontmatterBoolean(frontmatter, ['visible']),
  }
}

function mobileTypeDefinitionProperties(frontmatter: LocalVaultFrontmatter): Record<string, MobilePropertyValue> {
  return Object.fromEntries(
    Object.entries(frontmatterProperties(frontmatter)).map(([key, value]) => [key, mobilePropertyValue(value)]),
  )
}

function frontmatterValue(frontmatter: LocalVaultFrontmatter, keys: string[]) {
  for (const key of keys) {
    if (Object.hasOwn(frontmatter, key)) return frontmatter[key]

    const normalizedKey = normalizedFrontmatterLookupKey(key)
    const normalizedValues = snapshotFrontmatterValues(frontmatter)
    if (normalizedValues.has(normalizedKey)) return normalizedValues.get(normalizedKey)
  }
  return undefined
}

function snapshotFrontmatterValues(frontmatter: LocalVaultFrontmatter): SnapshotFrontmatterValues {
  const cached = snapshotFrontmatterValueCache.get(frontmatter)
  if (cached) return cached

  const values: SnapshotFrontmatterValues = new Map()
  for (const [key, value] of Object.entries(frontmatter)) {
    const normalizedKey = normalizedFrontmatterLookupKey(key)
    if (!values.has(normalizedKey)) values.set(normalizedKey, value)
  }
  snapshotFrontmatterValueCache.set(frontmatter, values)
  return values
}

function normalizedFrontmatterLookupKey(key: string): string {
  const cached = snapshotFrontmatterLookupKeyCache.get(key)
  if (cached) return cached

  const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_')
  snapshotFrontmatterLookupKeyCache.set(key, normalizedKey)
  return normalizedKey
}

function frontmatterText(frontmatter: LocalVaultFrontmatter, keys: string[]) {
  const value = frontmatterValue(frontmatter, keys)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function frontmatterNumber(frontmatter: LocalVaultFrontmatter, keys: string[]) {
  const value = frontmatterValue(frontmatter, keys)
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function frontmatterBoolean(frontmatter: LocalVaultFrontmatter, keys: string[]) {
  const value = frontmatterValue(frontmatter, keys)
  return typeof value === 'boolean' ? value : null
}

function localTypeDefinitions(entries: LocalVaultEntry[]): MobileTypeDefinitions {
  return Object.fromEntries(
    entries
      .filter(isActiveTypeEntry)
      .map((entry) => [entry.title, {
        ...entry.typeDefinition,
        path: entry.path,
        rawContent: entry.rawContent,
        tone: entry.typeDefinitionTone,
      }]),
  )
}

function isActiveTypeEntry(entry: LocalVaultEntry): boolean {
  return entry.type === 'Type' && !entry.archived
}

function parseViewFile(file: LocalVaultFile, index: number): MobileSavedView | null {
  return parseMobileSavedViewFile(file, index)
}



function isMobileSavedView(view: MobileSavedView | null): view is MobileSavedView {
  return view !== null
}

function cleanTypeName(value: string): NoteTypeName {
  return wikilinkTarget(value).replace(/\.md$/, '')
}

function localEntryToMobileNote(
  entry: LocalVaultEntry,
  resolveRelationship: RelationshipResolver,
  workspace: { alias: string | null; label: string },
  detailLevel: MobileNoteDetailLevel,
): MobileNote {
  const blocks = detailLevel === 'editable' ? localVaultEditorBlocks(entry.body) : undefined

  return {
    created: relativeDate(entry.createdAt),
    createdAt: entry.createdAt,
    aliases: entry.aliases,
    date: absoluteDate(entry.modifiedAt),
    editorBlocks: blocks,
    editorBullets: blocks ? localVaultEditorBullets(blocks) : undefined,
    favorite: entry.favorite,
    favoriteIndex: entry.favoriteIndex,
    fileKind: entry.fileKind,
    id: entry.id,
    icon: entry.icon,
    links: entry.links,
    modified: relativeDate(entry.modifiedAt),
    modifiedAt: entry.modifiedAt,
    noteWidth: entry.noteWidth,
    archived: entry.archived,
    organized: entry.organized,
    outgoingLinks: entry.outgoingLinks,
    path: entry.path,
    properties: entry.properties,
    rawContent: detailLevel === 'editable' ? entry.rawContent : undefined,
    relationships: mobileRelationships(entry.relationships, resolveRelationship),
    snippet: localVaultSnippet(entry.body),
    status: entry.status,
    tags: entry.tags,
    taskItems: entry.fileKind === 'text' || entry.fileKind === 'binary' ? undefined : extractChecklistItems(entry.rawContent),
    title: entry.title,
    type: entry.type,
    typeTone: entry.typeTone,
    workspace: workspace.label,
    workspaceAlias: workspace.alias,
  }
}

function visibleNoteEntries(entries: LocalVaultEntry[]): LocalVaultEntry[] {
  return entries.filter(isMobileInboxNote).sort(compareByModifiedDate)
}

function compareByModifiedDate(left: LocalVaultEntry, right: LocalVaultEntry): number {
  return (right.modifiedAt ?? 0) - (left.modifiedAt ?? 0)
}


function mobileRelationships(
  relationships: Record<RelationshipLabel, WikilinkTarget[]>,
  resolveRelationship: RelationshipResolver,
): MobileRelationship[] {
  return Object.entries(relationships).map(([label, values]) => ({
    key: label,
    kind: relationshipKindForKey(label),
    label: relationshipLabel(label),
    values: values.map((value) => relationshipValue(value, resolveRelationship)),
  }))
}

function relationshipLabel(label: RelationshipLabel): string | undefined {
  return relationshipKindForKey(label) === 'custom' ? humanizeRelationshipKey(label) : undefined
}

function relationshipValue(rawValue: WikilinkTarget, resolveRelationship: RelationshipResolver): MobileRelationshipValue {
  const link = parsedWikilink(rawValue)
  const target = link.target
  const entry = resolveRelationship(target)

  return {
    id: entry?.id,
    ref: rawValue,
    title: entry?.title ?? link.display,
    type: entry?.type ?? 'Note',
    typeTone: entry?.typeTone ?? 'gray',
  }
}

function mobileProperties(properties: Record<string, unknown>): MobileProperty[] {
  return Object.entries(properties).map(([key, value]) => ({
    key,
    label: humanizeRelationshipKey(key),
    value: mobilePropertyValue(value),
  }))
}

function mobilePropertyValue(value: unknown): MobilePropertyValue {
  if (Array.isArray(value)) return value.flatMap(scalarPropertyArrayItem)
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return ''
}

function scalarPropertyArrayItem(value: unknown): string[] {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  return []
}

function* relationshipResolver(entries: LocalVaultEntry[], workspaceAlias: string | null): Generator<void, RelationshipResolver> {
  const index = new Map<string, LocalVaultEntry>()
  let batchSize = 0
  for (const entry of entries) {
    for (const target of relationshipResolverTargets(entry, workspaceAlias)) {
      addRelationshipResolverTarget(index, target, entry)
      if (++batchSize === 32) { batchSize = 0; yield }
    }
  }

  return (target) => index.get(normalizeMobileWikilinkTarget(target)) ?? null
}

function relationshipResolverTargets(entry: LocalVaultEntry, workspaceAlias: string | null): string[] {
  const targets = [
    entry.path,
    entry.path.replace(/\.[^.]+$/, ''),
    entry.filename.replace(/\.[^.]+$/, ''),
    ...entry.aliases,
    entry.title,
  ]
  if (!workspaceAlias) return targets

  return [
    ...targets,
    ...targets.map((target) => `${workspaceAlias}/${target}`),
  ]
}

function addRelationshipResolverTarget(
  index: Map<string, LocalVaultEntry>,
  target: string,
  entry: LocalVaultEntry,
) {
  const normalized = normalizeMobileWikilinkTarget(target)
  if (normalized && !index.has(normalized)) index.set(normalized, entry)
}

function wikilinkTarget(value: string): WikilinkTarget {
  return parsedWikilink(value).target
}

function parsedWikilink(value: string): { display: string; target: WikilinkTarget } {
  const match = value.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/)
  const target = (match?.[1] ?? value).trim()
  return { display: (match?.[2] ?? target).trim(), target }
}

function toneFromDesktopColor(color: string | null, type: NoteTypeName): MobileTone {
  const normalized = color?.trim().toLowerCase()
  if (isMobileTone(normalized)) return normalized

  const fallback = typeToneFallbacks.get(type)
  return fallback ?? 'gray'
}

function isMobileTone(value: string | null | undefined): value is MobileTone {
  return value === 'blue'
    || value === 'gray'
    || value === 'green'
    || value === 'orange'
    || value === 'purple'
    || value === 'red'
    || value === 'yellow'
}

const typeToneFallbacks = new Map<string, MobileTone>([
  ['Event', 'yellow'], ['Experiment', 'red'], ['Person', 'yellow'], ['Procedure', 'purple'],
  ['Project', 'red'], ['Responsibility', 'purple'], ['Topic', 'green'], ['Type', 'blue'],
])


function humanizeRelationshipKey(label: RelationshipLabel): string {
  return label
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
