// @vitest-environment jsdom
import { act, createElement, type ComponentProps, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('phosphor-react-native', () => ({
  FolderOpen: () => null,
  MagnifyingGlass: () => null,
}))

vi.mock('../ui/text', () => ({
  Text: ({ children }: { children?: ReactNode }) => createElement('span', null, children),
}))

vi.mock('../../ui/MobileChip', () => ({
  MobileChip: () => null,
}))

vi.mock('@rn-primitives/slot', () => ({
  Slot: ({ children }: { children?: ReactNode }) => children,
}))

vi.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  default: ({ children }: { children?: ReactNode }) => children,
}))

vi.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children?: ReactNode }) => children,
  Gesture: {
    Pan: () => {
      const pan = {
        activeOffsetX: () => pan,
        failOffsetX: () => pan,
        failOffsetY: () => pan,
        onEnd: () => pan,
      }
      return pan
    },
  },
}))

vi.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: number) => ({ get: () => initial, set: () => {} }),
  runOnJS: <T extends (...args: unknown[]) => unknown>(cb: T) => cb,
}))

vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: <T,>(obj: { android?: T; default?: T; web?: T }) => obj.android ?? obj.default ?? obj.web,
  },
  View: ({ children, testID }: { children?: ReactNode; testID?: string }) =>
    createElement('div', { 'data-testid': testID }, children),
  Pressable: ({
    children,
    testID,
    onPress,
    accessibilityLabel,
  }: {
    children?: ReactNode
    testID?: string
    onPress?: () => void
    accessibilityLabel?: string
  }) =>
    createElement(
      'button',
      {
        type: 'button',
        'data-testid': testID,
        'aria-label': accessibilityLabel,
        onClick: onPress,
      },
      children,
    ),
  StyleSheet: { create: (styles: object) => styles, hairlineWidth: 1 },
}))

vi.mock('../../ui/theme/useMobileTheme', () => ({
  useMobileColors: () => ({
    card: '#fff',
    border: '#eee',
    textMuted: '#888',
    primary: '#6366f1',
    primarySoft: '#e0e7ff',
  }),
  useMobileStyles: () => ({
    styles: {
      chipRow: {},
      listContent: {},
    },
    mobileColors: {
      card: '#fff',
      primary: '#6366f1',
      textMuted: '#888',
    },
  }),
}))

vi.mock('../../ui/MobileListRow', () => ({
  MobileListRow: (props: { testID?: string; onPress?: () => void; title?: ReactNode; trailing?: ReactNode }) =>
    createElement(
      'div',
      {
        'data-testid': props.testID,
        onClick: props.onPress,
      },
      props.title,
      props.trailing,
    ),
}))

vi.mock('./MobilePendingNoteIndicator', () => ({
  MobilePendingNoteIndicator: () => null,
}))

vi.mock('./MobileWorkspaceIcons', () => ({
  MobileTypeIcon: ({ type }: { type: string }) => createElement('span', { 'data-testid': 'type-icon' }, type),
}))

import { MobileNoteListRow } from './MobileNoteListItems'
import type { MobileNote } from '../../workspace/mobileWorkspaceModel'

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks()
  host = document.createElement('div')
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})

function sampleNote(overrides: Partial<MobileNote> = {}): MobileNote {
  return {
    created: '2026-10-31',
    date: '2026-10-31',
    favorite: false,
    id: 'note-123',
    links: 0,
    modified: '2026-10-31',
    relationships: [],
    snippet: 'Kurzbeschreibung',
    status: 'open',
    tags: [],
    title: 'Wichtige Notiz',
    type: 'Task',
    typeTone: 'blue',
    workspace: 'default',
    ...overrides,
  }
}

describe('MobileNoteListRow Type Badge Interaction', () => {
  it('triggers onOpenChangeNoteType when type badge is clicked', async () => {
    const onSelectNote = vi.fn()
    const onOpenChangeNoteType = vi.fn()
    const note = sampleNote({ id: 'inbox-note-1', type: 'Task' })

    await act(async () => {
      root.render(
        createElement(MobileNoteListRow, {
          activeNoteId: null,
          displayPropertyKeys: [],
          layoutProbe: { probe: () => ({}) } as unknown as ComponentProps<typeof MobileNoteListRow>['layoutProbe'],
          note,
          onOpenChangeNoteType,
          onSelectNote,
        }),
      )
    })

    const badge = host.querySelector('[data-testid="note-row-type-badge-inbox-note-1"]')
    expect(badge).not.toBeNull()

    await act(async () => {
      badge?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onOpenChangeNoteType).toHaveBeenCalledWith(note)
  })
})
