// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { insertSpy } = vi.hoisted(() => ({
  insertSpy: vi.fn().mockResolvedValue(true),
}))

vi.mock('./mobileNativeEditorOperations', () => ({
  insertPlainTextIntoNativeEditor: insertSpy,
}))

import { MobileTaskDueToolbarAffordance } from './MobileTaskDueToolbarAffordance'

vi.mock('phosphor-react-native', () => ({
  CalendarBlank: () => null,
  Check: () => null,
  X: () => null,
}))

vi.mock('../ui/text', () => ({
  Text: ({ children }: { children?: ReactNode }) => createElement('span', null, children),
}))

vi.mock('../ui/button', () => ({
  Button: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) =>
    createElement('button', { type: 'button', onClick: onPress }, children),
}))

vi.mock('react-native', () => ({
  Modal: ({ children, visible }: { children?: ReactNode; visible?: boolean }) =>
    visible ? createElement('div', { 'data-testid': 'modal' }, children) : null,
  Pressable: ({ children, testID, onPress }: { children?: ReactNode; testID?: string; onPress?: () => void }) =>
    createElement('button', { type: 'button', 'data-testid': testID, onClick: onPress }, children),
  ScrollView: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  TextInput: ({ onChangeText, onSubmitEditing, value, placeholder }: { onChangeText?: (t: string) => void; onSubmitEditing?: () => void; value?: string; placeholder?: string }) =>
    createElement('input', {
      onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
      onKeyDown: (e: { key: string }) => { if (e.key === 'Enter') onSubmitEditing?.() },
      placeholder,
      value,
    }),
  View: ({ children, testID }: { children?: ReactNode; testID?: string }) => createElement('div', { 'data-testid': testID }, children),
}))

vi.mock('../../ui/theme/useMobileTheme', () => ({
  useMobileColors: () => ({
    border: '#e5e7eb',
    danger: '#ef4444',
    primary: '#6366f1',
    primarySoft: '#e0e7ff',
    surface: '#ffffff',
    surfaceElevated: '#f9fafb',
    text: '#111827',
    textInverse: '#ffffff',
    textMuted: '#6b7280',
  }),
}))

describe('MobileTaskDueToolbarAffordance', () => {
  let container: HTMLDivElement | null = null

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (container) document.body.removeChild(container)
    container = null
  })

  const fakeEditor = {
    getJSON: vi.fn(),
    setContent: vi.fn(),
  } as unknown as Parameters<typeof MobileTaskDueToolbarAffordance>[0]['editor']

  it('renders quick due chips and inserts formatted date on press', async () => {
    insertSpy.mockClear()
    const onInsertDate = vi.fn()

    if (!container) {
      throw new Error('Missing container')
    }
    const root = createRoot(container)
    act(() => {
      root.render(
        createElement(MobileTaskDueToolbarAffordance, {
          editor: fakeEditor,
          onInsertDate,
        })
      )
    })

    const bar = container.querySelector('[data-testid="task-due-affordance-bar"]')
    expect(bar).not.toBeNull()

    const todayButton = container.querySelector<HTMLButtonElement>('[data-testid="task-due-chip-today"]')
    expect(todayButton).not.toBeNull()
    if (!todayButton) {
      throw new Error('Missing todayButton')
    }

    act(() => {
      todayButton.click()
    })

    expect(insertSpy).toHaveBeenCalledWith(fakeEditor, expect.objectContaining({
      text: expect.stringMatching(/^\s*📅\s*\d{4}-\d{2}-\d{2}$/),
    }))
    expect(onInsertDate).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })
})
