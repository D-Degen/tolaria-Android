// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileNoteSwipeActions } from './MobileNoteSwipeActions'

vi.mock('phosphor-react-native', () => ({
  ArchiveIcon: () => null,
  CheckCircle: () => null,
  Star: () => null,
  Trash: () => null,
}))

vi.mock('react-native', () => ({
  StyleSheet: { create: <T extends Record<string, unknown>>(s: T): T => s },
  View: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
}))

vi.mock('../../ui/theme/useMobileTheme', () => ({
  useMobileStyles: () => ({
    mobileColors: {
      danger: '#ef4444',
      green: '#22c55e',
      primary: '#6366f1',
      textInverse: '#ffffff',
    },
    styles: {
      action: {},
      actions: {},
      archive: {},
      delete: {},
      favorite: {},
      organize: {},
    },
  }),
}))

vi.mock('../ui/button', () => ({
  Button: ({
    accessibilityLabel,
    children,
    onPress,
    testID,
  }: {
    accessibilityLabel?: string
    children?: ReactNode
    onPress?: () => void
    testID?: string
  }) => createElement('button', {
    type: 'button',
    'aria-label': accessibilityLabel,
    'data-testid': testID,
    onClick: onPress,
  }, children),
}))

vi.mock('react-native-reanimated', () => ({
  default: {
    View: ({ children, style }: { children?: ReactNode; style?: unknown }) =>
      createElement('div', { style: style as Record<string, unknown> }, children),
  },
  useAnimatedStyle: (fn: () => unknown) => fn(),
}))

describe('MobileNoteSwipeActions', () => {
  let container: HTMLDivElement | null = null

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (container) {
      document.body.removeChild(container)
    }
    container = null
  })

  it('renders archive button when not in inbox', () => {
    if (!container) throw new Error('Missing container')
    const onArchive = vi.fn()
    const onOrganize = vi.fn()
    const root = createRoot(container)

    act(() => {
      root.render(createElement(MobileNoteSwipeActions, {
        favorite: false,
        isInbox: false,
        noteId: 'note-1',
        onArchive,
        onDelete: vi.fn(),
        onFavorite: vi.fn(),
        onOrganize,
        translation: { value: 0 } as never,
        width: { value: 300 } as never,
      }))
    })

    const archiveButton = container.querySelector('[data-testid="note-swipe-archive-note-1"]')
    expect(archiveButton).not.toBeNull()
    const organizeButton = container.querySelector('[data-testid="note-swipe-organize-note-1"]')
    expect(organizeButton).toBeNull()

    if (archiveButton instanceof HTMLButtonElement) {
      act(() => {
        archiveButton.click()
      })
      expect(onArchive).toHaveBeenCalledTimes(1)
    }
  })

  it('renders organize button when in inbox', () => {
    if (!container) throw new Error('Missing container')
    const onArchive = vi.fn()
    const onOrganize = vi.fn()
    const root = createRoot(container)

    act(() => {
      root.render(createElement(MobileNoteSwipeActions, {
        favorite: false,
        isInbox: true,
        noteId: 'note-inbox',
        onArchive,
        onDelete: vi.fn(),
        onFavorite: vi.fn(),
        onOrganize,
        translation: { value: 0 } as never,
        width: { value: 300 } as never,
      }))
    })

    const archiveButton = container.querySelector('[data-testid="note-swipe-archive-note-inbox"]')
    expect(archiveButton).toBeNull()
    const organizeButton = container.querySelector('[data-testid="note-swipe-organize-note-inbox"]')
    expect(organizeButton).not.toBeNull()

    if (organizeButton instanceof HTMLButtonElement) {
      act(() => {
        organizeButton.click()
      })
      expect(onOrganize).toHaveBeenCalledTimes(1)
    }
  })
})
