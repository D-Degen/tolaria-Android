import { describe, expect, it } from 'vitest'
import { buildLocalVaultWorkspaceSnapshot } from './localVaultSnapshot'
import { vaultFile, projectTypeContent, typeMetadataVaultFiles, flattenSidebarFolders } from './localVaultSnapshotTestFixtures'

describe('buildLocalVaultWorkspaceSnapshot', () => {

  it('caps the rendered note list while keeping total vault counts and full navigation notes', () => {
    const files = Array.from({ length: 5 }, (_, index) => vaultFile(`note-${index}.md`, `---
type: Note
---
# Note ${index}

Body ${index}.
`, index))

    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files,
      maxNotes: 2,
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.notes.map((note) => note.title)).toEqual(['Note 4', 'Note 3'])
    expect(snapshot.allNotes?.map((note) => note.title)).toEqual(['Note 4', 'Note 3', 'Note 2', 'Note 1', 'Note 0'])
    expect(snapshot.noteListSubtitle).toBe('2 / 5')
    expect(snapshot.source).toMatchObject({ totalNotes: 5, visibleNotes: 2 })
  })

  it('orders local vault favorites by the desktop favorite index', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('unindexed.md', `---
type: Note
_favorite: true
---
# Unindexed Favorite
`, 30),
        vaultFile('later.md', `---
type: Note
_favorite: true
_favorite_index: 2
---
# Later Favorite
`, 20),
        vaultFile('middle.md', `---
type: Note
_favorite: true
favorite index: 1
---
# Middle Favorite
`, 25),
        vaultFile('first.md', `---
type: Note
_favorite: true
favorite_index: 0
---
# First Favorite
`, 10),
        vaultFile('archived.md', `---
type: Note
_favorite: true
_favorite_index: 1
_archived: true
---
# Archived Favorite
`, 40),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.sidebarSections.find((section) => section.id === 'favorites')?.items?.map((item) => item.label)).toEqual([
      'First Favorite',
      'Middle Favorite',
      'Later Favorite',
      'Unindexed Favorite',
    ])
  })

  it('keeps local vault Inbox empty instead of falling back to active notes', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('organized.md', `---
type: Note
_organized: true
---
# Organized
`),
        vaultFile('archived.md', `---
type: Note
_archived: true
---
# Archived
`),
        vaultFile('types/project.md', `---
type: Type
---
# Project
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.notes).toEqual([])
    expect(snapshot.selectedNoteId).toBeUndefined()
    expect(snapshot.sidebarSections.find((section) => section.id === 'primary')?.items).toEqual([
      expect.objectContaining({ count: '0', id: 'inbox' }),
      expect.objectContaining({ count: '0', id: 'tasks' }),
      expect.objectContaining({ count: '2', id: 'all-notes' }),
      expect.objectContaining({ count: '1', id: 'archive' }),
    ])
    expect(snapshot.source).toMatchObject({ totalNotes: 3, visibleNotes: 0 })
    expect(snapshot.allNotes?.map((note) => note.title)).toEqual(
      expect.arrayContaining(['Project', 'Organized', 'Archived']),
    )
    expect(snapshot.allNotes?.find((note) => note.title === 'Project')).toMatchObject({
      type: 'Type',
      typeTone: 'blue',
    })
  })

  it('loads desktop file kinds while keeping default primary note filters markdown-only', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('Inbox/root.md', `---
type: Note
---
# Root
`),
        vaultFile('attachments/reference.md', `---
type: Note
_organized: true
---
# Attachment Markdown
`, 1),
        vaultFile('views/workspace.yml', 'name: Workspace View\nfilters:\n  all: []\n', 2),
        vaultFile('assets/logo.png', '', 3),
        vaultFile('Archive/old.md', `---
type: Note
_archived: true
---
# Old
`, 4),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.source).toMatchObject({ totalNotes: 5, visibleNotes: 1 })
    expect(snapshot.notes.map((note) => note.title)).toEqual(['Root'])
    expect(snapshot.allNotes?.find((note) => note.path === 'views/workspace.yml')).toMatchObject({
      fileKind: 'text',
      title: 'Workspace View',
      type: 'File',
    })
    expect(snapshot.allNotes?.find((note) => note.path === 'assets/logo.png')).toMatchObject({
      fileKind: 'binary',
      title: 'logo.png',
      type: 'File',
    })
    expect(snapshot.sidebarSections.find((section) => section.id === 'primary')?.items).toEqual([
      expect.objectContaining({ count: '1', id: 'inbox' }),
      expect.objectContaining({ count: '0', id: 'tasks' }),
      expect.objectContaining({ count: '1', id: 'all-notes' }),
      expect.objectContaining({ count: '1', id: 'archive' }),
    ])
    expect(snapshot.sidebarSections.find((section) => section.id === 'types')?.items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ typeName: 'File' })]),
    )
  })

  it('keeps archived Type documents out of live type metadata while counting them as archived notes', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('types/recipe.md', `---
type: Type
_archived: true
color: orange
---
# Recipe
`),
        vaultFile('recipes/pasta.md', `---
type: Recipe
_organized: false
---
# Pasta
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.typeDefinitions?.Recipe).toBeUndefined()
    expect(snapshot.sidebarSections.find((section) => section.id === 'primary')?.items).toEqual([
      expect.objectContaining({ count: '1', id: 'inbox' }),
      expect.objectContaining({ count: '0', id: 'tasks' }),
      expect.objectContaining({ count: '1', id: 'all-notes' }),
      expect.objectContaining({ count: '1', id: 'archive' }),
    ])
    expect(snapshot.sidebarSections.find((section) => section.id === 'types')?.items).toEqual([
      expect.objectContaining({ count: '1', label: 'Recipes', tone: 'gray', typeName: 'Recipe' }),
    ])
  })

  it('parses saved views into the mobile sidebar and counts matching notes', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('views/active-projects.yml', `name: Active Projects
icon: rocket
color: blue
sort: "modified:desc"
filters:
  all:
    - field: type
      op: equals
      value: Project
`),
        vaultFile('project.md', projectTypeContent),
        vaultFile('active-project.md', `---
type: Project
_organized: false
---
# Active Project
`),
        vaultFile('active-note.md', `---
type: Note
_organized: false
---
# Active Note
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.views?.map((view) => view.definition.name)).toEqual(['Active Projects'])
    expect(snapshot.sidebarSections.find((section) => section.id === 'views')?.items?.[0]).toMatchObject({
      count: '1',
      icon: 'rocket',
      id: 'view-active-projects',
      label: 'Active Projects',
      viewId: 'view-active-projects',
    })
  })

  it('loads legacy desktop saved views from .laputa/views for read-only mobile snapshots', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('.laputa/views/legacy-focus.yml', `name: Legacy Focus
filters:
  all:
    - field: type
      op: equals
      value: Project
`),
        vaultFile('project.md', projectTypeContent),
        vaultFile('active-project.md', `---
type: Project
_organized: false
---
# Active Project
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.views?.map((view) => view.definition.name)).toEqual(['Legacy Focus'])
    expect(snapshot.sidebarSections.find((section) => section.id === 'views')?.items?.[0]).toMatchObject({
      count: '1',
      id: 'view-legacy-focus',
      label: 'Legacy Focus',
    })
  })

  it('preserves desktop type document sidebar metadata for mobile navigation', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: typeMetadataVaultFiles(),
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.typeDefinitions?.Project).toMatchObject({
      color: 'red',
      label: 'Client Work',
      listPropertiesDisplay: ['Priority', 'belongs_to'],
      order: 2,
      path: 'types/project.md',
      properties: {
        Priority: 'Medium',
        has: 'Milestone',
      },
      relationships: {
        depends_on: ['[[project-template]]'],
      },
      sort: 'property:Priority:asc',
      template: '## Objective\n\nUse this project shape.',
      tone: 'red',
    })
    expect(snapshot.typeDefinitions?.Project?.rawContent).toContain('sidebar_label: Client Work')
    expect(snapshot.typeDefinitions?.Secret).toMatchObject({ visible: false })

    const typeItems = snapshot.sidebarSections.find((section) => section.id === 'types')?.items ?? []
    expect(typeItems).toEqual([
      expect.objectContaining({ count: '2', label: 'Client Work', typeName: 'Project' }),
      expect.objectContaining({ count: '1', label: 'Notes', typeName: 'Note' }),
      expect.objectContaining({ count: '0', label: 'Topics', tone: 'green', typeName: 'Topic' }),
      expect.objectContaining({ count: '3', label: 'Types', tone: 'blue', typeName: 'Type' }),
    ])
    expect(typeItems).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ typeName: 'Secret' })]),
    )
  })

  it('normalizes desktop Type document metadata aliases before building mobile navigation', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('types/project.md', `---
Is A: Type
Color: red
Icon: folder
Order: 2
Sidebar Label: Client Work
Sort: property:Priority:asc
View: editor-list
Visible: false
---
# Project
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.typeDefinitions?.Project).toMatchObject({
      icon: 'folder',
      label: 'Client Work',
      order: 2,
      sort: 'property:Priority:asc',
      view: 'editor-list',
      visible: false,
    })
  })

  it('prefers canonical desktop Type icon metadata over legacy aliases', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('types/project.md', `---
type: Type
icon: folder
_icon: tag
---
# Project
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.typeDefinitions?.Project?.icon).toBe('tag')
    expect(snapshot.sidebarSections.find((section) => section.id === 'types')?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ icon: 'tag', typeName: 'Project' }),
    ]))
  })

  it('honors desktop numeric boolean flags when deriving local vault notes', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('Favorite Draft.md', `---
_favorite: 1
_organized: 0
---
# Favorite Draft
`),
        vaultFile('Archive/Hidden.md', `---
_archived: 1
---
# Hidden
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    const favorite = snapshot.allNotes?.find((note) => note.id === 'Favorite Draft.md')
    const archived = snapshot.allNotes?.find((note) => note.id === 'Archive/Hidden.md')
    expect(favorite).toMatchObject({ favorite: true, organized: false })
    expect(archived).toMatchObject({ archived: true })
    expect(snapshot.sidebarSections.find((section) => section.id === 'favorites')?.items?.[0]).toMatchObject({
      id: 'favorite-Favorite Draft.md',
      label: 'Favorite Draft',
    })
    expect(snapshot.sidebarSections.find((section) => section.id === 'primary')?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'inbox', count: '1' }),
        expect.objectContaining({ id: 'archive', count: '1' }),
      ]),
    )
  })

  it('preserves desktop scalar-array properties as mobile list display values', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('Scored.md', `---
score: [1, true, "Needs Review"]
_organized: false
---
# Scored
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.notes[0]?.properties).toContainEqual({
      key: 'score',
      label: 'Score',
      value: ['1', 'true', 'Needs Review'],
    })
  })

  it('derives sidebar primary counts, type counts, and folder paths from local vault notes', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('types/project.md', projectTypeContent),
        vaultFile('Writing/Projects/Active Project.md', `---
type: Project
_organized: false
---
# Active Project
`),
        vaultFile('Writing/Drafts/Organized Note.md', `---
type: Note
_organized: true
---
# Organized Note
`),
        vaultFile('Archive/Old Project.md', `---
type: Project
_archived: true
---
# Old Project
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.sidebarSections.find((section) => section.id === 'primary')?.items).toEqual([
      expect.objectContaining({ count: '1', id: 'inbox' }),
      expect.objectContaining({ count: '0', id: 'tasks' }),
      expect.objectContaining({ count: '3', id: 'all-notes' }),
      expect.objectContaining({ count: '1', id: 'archive' }),
    ])
    expect(snapshot.sidebarSections.find((section) => section.id === 'types')?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ count: '1', label: 'Projects' }),
        expect.objectContaining({ count: '1', label: 'Notes' }),
      ]),
    )
    expect(flattenSidebarFolders(snapshot.sidebarSections.find((section) => section.id === 'folders')?.folders ?? [])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Writing', name: 'Writing' }),
        expect.objectContaining({ id: 'Writing/Projects', name: 'Projects' }),
        expect.objectContaining({ id: 'Writing/Drafts', name: 'Drafts' }),
      ]),
    )
  })

  it('renders explicit empty vault folders in the sidebar', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('Writing/Projects/Active Project.md', '# Active Project\n'),
      ],
      folderPaths: ['Writing', 'Writing/Empty'],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.folderPaths).toEqual(['Writing', 'Writing/Empty'])
    expect(flattenSidebarFolders(snapshot.sidebarSections.find((section) => section.id === 'folders')?.folders ?? [])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Writing/Empty', name: 'Empty' }),
      ]),
    )
  })
})
