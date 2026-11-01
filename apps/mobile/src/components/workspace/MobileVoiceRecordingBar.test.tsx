// @vitest-environment jsdom
import { createElement, type ReactNode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileVoiceRecordingBar } from './MobileVoiceRecordingBar'

const mockStartVoice = vi.fn().mockResolvedValue(true)
const mockStopVoice = vi.fn().mockResolvedValue('Wichtiges Meeting morgen um 10 Uhr')
const mockCancelVoice = vi.fn().mockResolvedValue(undefined)
const mockGenerateDraft = vi.fn().mockResolvedValue({
  title: 'Meeting morgen',
  type: 'Meeting',
  tags: ['meeting'],
  todos: ['- [ ] Vorbereitung treffen'],
  markdownBody: 'Wichtiges Meeting morgen um 10 Uhr',
})

vi.mock('../../workspace/smartNotes/smartNotesEngine', () => ({
  startVoiceRecordingSession: () => mockStartVoice(),
  stopVoiceRecordingSession: () => mockStopVoice(),
  cancelVoiceRecordingSession: () => mockCancelVoice(),
  generateSmartNoteDraft: (text: string, types: string[]) => mockGenerateDraft(text, types),
  subscribeVoiceRecordingRms: () => () => {},
  subscribeVoiceRecordingPartial: () => () => {},
}))

vi.mock('phosphor-react-native', () => ({
  PaperPlaneRight: () => null,
  Trash: () => null,
}))

vi.mock('../ui/text', () => ({
  Text: ({ children, testID }: { children?: ReactNode; testID?: string }) =>
    createElement('span', { 'data-testid': testID }, children),
}))

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 16, top: 0, left: 0, right: 0 }),
}))

vi.mock('react-native', () => ({
  ActivityIndicator: () => createElement('span', { 'data-testid': 'activity-indicator' }),
  Animated: {
    loop: () => ({ start: vi.fn(), stop: vi.fn() }),
    sequence: () => ({}),
    timing: () => ({}),
    Value: class {
      constructor(public val: number) {}
    },
    View: ({ children }: { children?: ReactNode }) =>
      createElement('div', { 'data-testid': 'animated-view' }, children),
  },
  Platform: { OS: 'android' },
  Pressable: ({
    accessibilityLabel,
    children,
    onPress,
    testID,
  }: {
    accessibilityLabel?: string
    children?: ReactNode
    onPress?: () => void
    testID?: string
  }) =>
    createElement(
      'button',
      {
        type: 'button',
        'aria-label': accessibilityLabel,
        'data-testid': testID,
        onClick: onPress,
      },
      children,
    ),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(s: T): T => s,
    hairlineWidth: 1,
  },
  Text: ({ children, testID }: { children?: ReactNode; testID?: string }) =>
    createElement('span', { 'data-testid': testID }, children),
  Vibration: { vibrate: vi.fn() },
  View: ({ children, testID }: { children?: ReactNode; testID?: string }) =>
    createElement('div', { 'data-testid': testID }, children),
}))

vi.mock('../../ui/theme/useMobileTheme', () => ({
  useMobileStyles: () => ({
    mobileColors: {
      border: '#e2e8f0',
      card: '#ffffff',
      danger: '#ef4444',
      primary: '#6366f1',
      purple: '#a855f7',
      text: '#0f172a',
      textInverse: '#ffffff',
      textMuted: '#64748b',
    },
    styles: {
      cancelButton: {},
      container: {},
      leftGroup: {},
      previewRow: {},
      previewText: {},
      processingRow: {},
      processingText: {},
      recordingRow: {},
      redDot: {},
      rightGroup: {},
      sendButton: {},
      timerText: {},
      waveformBar: {},
      waveformContainer: {},
    },
  }),
}))

describe('MobileVoiceRecordingBar', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('does not render when visible is false', () => {
    const root = createRoot(container)
    act(() => {
      root.render(
        createElement(MobileVoiceRecordingBar, {
          onClose: vi.fn(),
          visible: false,
        }),
      )
    })

    expect(container.querySelector('[data-testid="mobile-voice-recording-bar"]')).toBeNull()
  })

  it('renders timer, waveform, cancel and send buttons when visible is true', async () => {
    const root = createRoot(container)
    await act(async () => {
      root.render(
        createElement(MobileVoiceRecordingBar, {
          onClose: vi.fn(),
          visible: true,
        }),
      )
    })

    expect(container.querySelector('[data-testid="mobile-voice-recording-bar"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="voice-record-timer"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="voice-record-waveform"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="voice-record-cancel"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="voice-record-send"]')).not.toBeNull()
    expect(mockStartVoice).toHaveBeenCalledTimes(1)
  })

  it('cancels voice recording and closes bar when trash button is clicked', async () => {
    const onClose = vi.fn()
    const root = createRoot(container)
    await act(async () => {
      root.render(
        createElement(MobileVoiceRecordingBar, {
          onClose,
          visible: true,
        }),
      )
    })

    const cancelButton = container.querySelector('[data-testid="voice-record-cancel"]') as HTMLButtonElement
    expect(cancelButton).not.toBeNull()

    await act(async () => {
      cancelButton.click()
    })

    expect(mockCancelVoice).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stops recording, structures note with AI, and invokes onCreateSmartNote when send button is clicked', async () => {
    const onClose = vi.fn()
    const onCreateSmartNote = vi.fn()
    const root = createRoot(container)

    await act(async () => {
      root.render(
        createElement(MobileVoiceRecordingBar, {
          availableTypes: ['Note', 'Meeting'],
          onClose,
          onCreateSmartNote,
          visible: true,
        }),
      )
    })

    const sendButton = container.querySelector('[data-testid="voice-record-send"]') as HTMLButtonElement
    expect(sendButton).not.toBeNull()

    await act(async () => {
      sendButton.click()
    })

    expect(mockStopVoice).toHaveBeenCalledTimes(1)
    expect(mockGenerateDraft).toHaveBeenCalledWith('Wichtiges Meeting morgen um 10 Uhr', ['Note', 'Meeting'])
    expect(onCreateSmartNote).toHaveBeenCalledWith({
      title: 'Meeting morgen',
      type: 'Meeting',
      tags: ['meeting'],
      todos: ['- [ ] Vorbereitung treffen'],
      markdownBody: 'Wichtiges Meeting morgen um 10 Uhr',
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
