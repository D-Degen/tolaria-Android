// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  handlePhoneWorkspaceBackPress,
  usePhoneWorkspaceBackHandler,
  type PhoneWorkspaceBackHandlerOptions,
} from './usePhoneWorkspaceBackHandler'

const platform = vi.hoisted(() => ({ OS: 'android' }))
const back = vi.hoisted(() => ({
  listen: vi.fn<(name: string, listener: () => boolean) => { remove: () => void }>(),
  remove: vi.fn(),
}))

vi.mock('react-native', () => ({
  Platform: platform,
  BackHandler: { addEventListener: back.listen },
}))

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks()
  platform.OS = 'android'
  host = document.createElement('div')
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})

it('navigates from editor to list on back press', () => {
  const openList = vi.fn()
  const openEditor = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'editor',
    navigation: { openEditor, openList },
  })
  expect(handled).toBe(true)
  expect(openList).toHaveBeenCalledOnce()
  expect(openEditor).not.toHaveBeenCalled()
})

it('navigates from properties to editor on back press', () => {
  const openList = vi.fn()
  const openEditor = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'properties',
    navigation: { openEditor, openList },
  })
  expect(handled).toBe(true)
  expect(openEditor).toHaveBeenCalledOnce()
  expect(openList).not.toHaveBeenCalled()
})

it('navigates from sidebar to list on back press', () => {
  const openList = vi.fn()
  const openEditor = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'sidebar',
    navigation: { openEditor, openList },
  })
  expect(handled).toBe(true)
  expect(openList).toHaveBeenCalledOnce()
})

it('prioritizes closing command palette over screen navigation', () => {
  const closeCommandPalette = vi.fn()
  const openList = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'editor',
    navigation: { openEditor: vi.fn(), openList },
    commandPaletteVisible: true,
    closeCommandPalette,
  })
  expect(handled).toBe(true)
  expect(closeCommandPalette).toHaveBeenCalledOnce()
  expect(openList).not.toHaveBeenCalled()
})

it('prioritizes closing active workspace action sheet over screen navigation', () => {
  const closeAction = vi.fn()
  const openList = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'editor',
    navigation: { openEditor: vi.fn(), openList },
    openAction: 'search',
    closeAction,
  })
  expect(handled).toBe(true)
  expect(closeAction).toHaveBeenCalledOnce()
  expect(openList).not.toHaveBeenCalled()
})

it('clears bulk selection when on list screen with active bulk selection', () => {
  const clearBulkSelection = vi.fn()
  const clearSearch = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'list',
    navigation: { openEditor: vi.fn(), openList: vi.fn() },
    bulkSelectionActive: true,
    clearBulkSelection,
    searchQuery: 'testing',
    clearSearch,
  })
  expect(handled).toBe(true)
  expect(clearBulkSelection).toHaveBeenCalledOnce()
  expect(clearSearch).not.toHaveBeenCalled()
})

it('clears search query when on list screen', () => {
  const clearSearch = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'list',
    navigation: { openEditor: vi.fn(), openList: vi.fn() },
    searchQuery: 'testing',
    clearSearch,
  })
  expect(handled).toBe(true)
  expect(clearSearch).toHaveBeenCalledOnce()
})

it('exits neighborhood when on list screen with neighborhood active', () => {
  const goBack = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'list',
    navigation: { openEditor: vi.fn(), openList: vi.fn() },
    neighborhood: { root: 'note-1' },
    goBack,
  })
  expect(handled).toBe(true)
  expect(goBack).toHaveBeenCalledOnce()
})

it('navigates back in history when canGoBack is true', () => {
  const goBack = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'list',
    navigation: { openEditor: vi.fn(), openList: vi.fn() },
    canGoBack: true,
    goBack,
  })
  expect(handled).toBe(true)
  expect(goBack).toHaveBeenCalledOnce()
})

it('navigates to inbox when not in inbox and canGoBack is false', () => {
  const selectInbox = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'list',
    navigation: { openEditor: vi.fn(), openList: vi.fn() },
    canGoBack: false,
    isInbox: false,
    selectInbox,
  })
  expect(handled).toBe(true)
  expect(selectInbox).toHaveBeenCalledOnce()
})

it('prompts user and prevents exit on first back press at root inbox', () => {
  const showExitToast = vi.fn()
  const onBackPressTimeUpdate = vi.fn()
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'list',
    navigation: { openEditor: vi.fn(), openList: vi.fn() },
    isInbox: true,
    canGoBack: false,
    lastBackPressTime: 0,
    showExitToast,
    onBackPressTimeUpdate,
  })
  expect(handled).toBe(true)
  expect(showExitToast).toHaveBeenCalledOnce()
  expect(onBackPressTimeUpdate).toHaveBeenCalledWith(expect.any(Number))
})

it('returns false on second back press within 2000ms at root inbox allowing system exit', () => {
  const handled = handlePhoneWorkspaceBackPress({
    phoneState: 'list',
    navigation: { openEditor: vi.fn(), openList: vi.fn() },
    isInbox: true,
    canGoBack: false,
    lastBackPressTime: Date.now() - 500,
  })
  expect(handled).toBe(false)
})

function BackHandlerProbe({ options }: { options: PhoneWorkspaceBackHandlerOptions }) {
  usePhoneWorkspaceBackHandler(options)
  return null
}

it('subscribes to BackHandler on Android and updates to latest options without re-subscribing', async () => {
  back.listen.mockImplementation(() => ({ remove: back.remove }))

  const openList1 = vi.fn()
  const openList2 = vi.fn()

  await act(async () => {
    root.render(createElement(BackHandlerProbe, {
      options: { phoneState: 'editor', navigation: { openEditor: vi.fn(), openList: openList1 } },
    }))
  })

  expect(back.listen).toHaveBeenCalledOnce()
  expect(back.listen.mock.calls[0]?.[0]).toBe('hardwareBackPress')
  const listener = back.listen.mock.calls[0]?.[1]

  await act(async () => {
    root.render(createElement(BackHandlerProbe, {
      options: { phoneState: 'editor', navigation: { openEditor: vi.fn(), openList: openList2 } },
    }))
  })

  // Listener should not have been re-subscribed
  expect(back.listen).toHaveBeenCalledOnce()

  // But invoking it uses the latest options
  const handled = listener?.()
  expect(handled).toBe(true)
  expect(openList1).not.toHaveBeenCalled()
  expect(openList2).toHaveBeenCalledOnce()
})

it('does not subscribe to BackHandler on non-Android platforms', async () => {
  platform.OS = 'ios'

  await act(async () => {
    root.render(createElement(BackHandlerProbe, {
      options: { phoneState: 'editor', navigation: { openEditor: vi.fn(), openList: vi.fn() } },
    }))
  })

  expect(back.listen).not.toHaveBeenCalled()
})
