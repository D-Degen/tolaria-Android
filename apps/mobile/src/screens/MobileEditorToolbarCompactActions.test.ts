// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MobileNote } from '../workspace/mobileWorkspaceModel'
import { MobileEditorToolbarMarkdownActions } from './MobileEditorToolbarMarkdownActions'
import type { EditorToolbarProps } from './TabletEditorPanel.types'

vi.mock('react-native', () => ({
  View: ({ children, testID }: { children?: ReactNode; testID?: string }) =>
    createElement('div', { 'data-testid': testID }, children),
  Pressable: ({ children, testID, onPress }: { children?: ReactNode; testID?: string; onPress?: () => void }) =>
    createElement('button', { type: 'button', 'data-testid': testID, onClick: onPress }, children),
  StyleSheet: { create: (styles: object) => styles },
}))

vi.mock('phosphor-react-native', () => ({
  Code: () => null,
  DotsThree: () => null,
  Star: () => null,
}))

vi.mock('../ui/MobileIconButton', () => ({
  MobileIconButton: ({ children, testID, onPress }: { children?: ReactNode; testID?: string; onPress?: () => void }) =>
    createElement('button', { type: 'button', 'data-testid': testID, onClick: onPress }, children),
}))

vi.mock('../ui/MobileChip', () => ({
  MobileChip: () => createElement('span', { 'data-testid': 'mock-chip' }),
}))

vi.mock('../ui/theme/useMobileTheme', () => ({
  useMobileColors: () => ({ primary: '#6366f1', textMuted: '#999' }),
  useMobileMetrics: () => ({ toolbarAction: { iconSize: 20 } }),
}))

vi.mock('../i18n/mobileText', () => ({
  mobileText: (key: string) => key,
}))

describe('MobileEditorToolbarCompactActions', () => {
  let root: ReturnType<typeof createRoot> | null = null
  let host: HTMLDivElement

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root?.unmount())
    vi.unstubAllGlobals()
  })

  const dummyProps: EditorToolbarProps = {
    compact: true,
    editing: false,
    editingMode: 'wysiwyg',
    fileMode: 'markdown',
    note: {
      id: 'test-note',
      title: 'Test Note',
      type: 'note',
      typeTone: 'blue',
      favorite: false,
      archived: false,
      deleted: false,
      ctime: 1000,
      mtime: 2000,
      path: 'test.md',
    } as unknown as MobileNote,
    onOpenChangeNoteType: vi.fn(),
    onOpenMoreActions: vi.fn(),
    onOpenSmartNotes: vi.fn(),
    onOpenTableOfContents: vi.fn(),
    onToggleFavorite: vi.fn(),
    onToggleSourceMode: vi.fn(),
    renameFilename: { value: 'test', notes: [], onChange: vi.fn(), onSubmit: vi.fn() },
    typeDefinitions: {},
  }

  it('omits editor-more-action and provides editor-source-action when compact is true (mobile)', async () => {
    await act(async () => root?.render(createElement(MobileEditorToolbarMarkdownActions, { ...dummyProps, compact: true })))

    // More note actions button MUST be removed from note titlebar on phone
    expect(host.querySelector('[data-testid="editor-more-action"]')).toBeNull()

    // Raw mode toggle button MUST be available on phone
    expect(host.querySelector('[data-testid="editor-source-action"]')).not.toBeNull()
  })

  it('includes editor-more-action and editor-source-action when compact is false (tablet)', async () => {
    await act(async () => root?.render(createElement(MobileEditorToolbarMarkdownActions, { ...dummyProps, compact: false })))

    expect(host.querySelector('[data-testid="editor-more-action"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="editor-source-action"]')).not.toBeNull()
  })
})
