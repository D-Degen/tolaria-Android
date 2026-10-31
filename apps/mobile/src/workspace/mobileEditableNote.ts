import {
  frontmatterFlag, frontmatterList, frontmatterProperties, frontmatterRelationships,
  frontmatterScalar, parseLocalVaultDocument,
  type LocalVaultFrontmatter, type LocalVaultFrontmatterScalar, type LocalVaultFrontmatterValue,
} from './localVaultFrontmatter'
import {
  deriveLocalVaultTitle, localVaultEditorBlocks, localVaultEditorBullets,
  localVaultLinkCount, localVaultOutgoingLinks, localVaultSnippet,
} from './localVaultMarkdown'
import type { MobileNote, MobileProperty, MobilePropertyValue, MobileTypeDefinitions } from './mobileWorkspaceModel'
import { noteFilename, noteWritePath } from './mobileWorkspacePathRewrites'
import { normalizeMobileNoteWidth } from './mobileNoteWidth'
import { mobileWorkspaceTypeTone } from './mobileWorkspaceTypeTone'
import { parseMobileWikilink } from './mobileWikilinks'
import { extractChecklistItems } from './mobileTasks'

export type EditableNoteInput = MobileNote & { rawContent: string }
export type DerivedNote = { note: MobileNote; rawRelationships: Record<string, string[]> }
type MarkdownContent = string
type FrontmatterKey = string

export function deriveEditableNote({
  fallback,
  rawContent,
  typeDefinitions,
}: {
  fallback: EditableNoteInput
  rawContent: MarkdownContent
  typeDefinitions?: MobileTypeDefinitions
}): DerivedNote {
  const document = parseLocalVaultDocument(rawContent)
  const filename = noteFilename(noteWritePath(fallback))
  const type = cleanTypeName(frontmatterScalar(document.frontmatter, ['type', 'Is A', 'is_a']) ?? fallback.type)
  const blocks = localVaultEditorBlocks(document.body)
  const properties = mobileProperties(frontmatterProperties(document.frontmatter))

  return {
    note: {
      ...fallback,
      aliases: frontmatterList(document.frontmatter, ['aliases', 'Aliases']),
      archived: frontmatterFlag(document.frontmatter, ['_archived', 'archived']),
      editorBlocks: blocks,
      editorBullets: localVaultEditorBullets(blocks),
      favorite: frontmatterFlag(document.frontmatter, ['_favorite', 'favorite']),
      favoriteIndex: frontmatterNumber(document.frontmatter, ['_favorite_index', 'favorite_index', 'favorite index']),
      icon: frontmatterText(document.frontmatter, ['_icon', 'icon']),
      links: localVaultLinkCount(document.body),
      modified: '0m ago',
      noteWidth: normalizeMobileNoteWidth(frontmatterScalar(document.frontmatter, ['_width', 'width'])),
      organized: frontmatterFlag(document.frontmatter, ['_organized']),
      outgoingLinks: localVaultOutgoingLinks(document.body),
      path: fallback.path ?? fallback.id,
      properties,
      rawContent,
      status: frontmatterScalar(document.frontmatter, ['Status', 'status']) ?? '',
      snippet: localVaultSnippet(document.body),
      tags: frontmatterList(document.frontmatter, ['tags', 'Tags']),
      taskItems: extractChecklistItems(rawContent),
      title: deriveLocalVaultTitle({
        body: document.body,
        fallbackTitle: frontmatterScalar(document.frontmatter, ['title']),
        filename,
      }),
      type,
      typeTone: mobileWorkspaceTypeTone(type, typeDefinitions, fallback.typeTone),
    },
    rawRelationships: frontmatterRelationships(document.frontmatter),
  }
}

function mobileProperties(properties: Record<string, LocalVaultFrontmatterValue>): MobileProperty[] {
  return Object.entries(properties).map(([key, value]) => ({
    key,
    label: humanizeKey(key),
    value: mobilePropertyValue(value),
  }))
}

function mobilePropertyValue(value: LocalVaultFrontmatterValue): MobilePropertyValue {
  if (Array.isArray(value)) return value.flatMap(scalarPropertyArrayItem)
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return ''
}

function scalarPropertyArrayItem(value: LocalVaultFrontmatterScalar): string[] {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  return []
}

export function cleanTypeName(value: string): string {
  return (parseMobileWikilink(value)?.target ?? value.trim()).replace(/\.md$/, '')
}

export function humanizeKey(key: FrontmatterKey): string {
  return key
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function normalizedFrontmatterKey(key: FrontmatterKey): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_')
}

function frontmatterText(frontmatter: LocalVaultFrontmatter, keys: readonly FrontmatterKey[]): string | null {
  return matchingFrontmatterValue(frontmatter, keys, (value) => (
    typeof value === 'string' && value.trim() ? value.trim() : null
  ))
}

function frontmatterNumber(frontmatter: LocalVaultFrontmatter, keys: readonly FrontmatterKey[]): number | null {
  return matchingFrontmatterValue(frontmatter, keys, (value) => (
    typeof value === 'number' && Number.isFinite(value) ? value : null
  ))
}

function matchingFrontmatterValue<T>(
  frontmatter: LocalVaultFrontmatter,
  keys: readonly FrontmatterKey[],
  normalize: (value: LocalVaultFrontmatterValue | undefined) => T | null,
): T | null {
  for (const key of keys) {
    const value = normalize(frontmatterValueForKey(frontmatter, key))
    if (value !== null) return value
  }
  return null
}

function frontmatterValueForKey(
  frontmatter: LocalVaultFrontmatter,
  key: FrontmatterKey,
): LocalVaultFrontmatterValue | undefined {
  const exactValue = frontmatter[key]
  if (exactValue !== undefined) return exactValue

  const normalizedKey = normalizedFrontmatterKey(key)
  return Object.entries(frontmatter).find(([candidateKey]) => (
    normalizedFrontmatterKey(candidateKey) === normalizedKey
  ))?.[1]
}
