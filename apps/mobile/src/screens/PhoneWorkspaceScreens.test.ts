// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PhoneWorkspaceScreens } from './PhoneWorkspaceScreens'
import { createPhoneWorkspaceScreenProps } from './PhoneWorkspaceScreens.testSupport'

const calls = vi.hoisted(() => ({ sidebar: vi.fn(), list: vi.fn(), properties: vi.fn(), editor: vi.fn() }))
vi.mock('react-native', () => ({
  View: ({ children, testID }: { children?: ReactNode; testID?: string }) =>
    createElement('div', { 'data-testid': testID }, children),
  Pressable: ({ children, testID, onPress }: { children?: ReactNode; testID?: string; onPress?: () => void }) =>
    createElement('button', { type: 'button', 'data-testid': testID, onClick: onPress }, children),
  StyleSheet: { create: (styles: object) => styles, hairlineWidth: 1 },
}))
vi.mock('../components/workspace/MobileNoteListPanel', () => ({ MobileNoteListPanel: (props: Record<string, unknown>) => {
  calls.list(props)
  return createElement('div', { 'data-testid': 'phone-test-note-list' }, props.leading as ReactNode)
} }))
vi.mock('../components/workspace/MobilePropertiesPanel', () => ({ MobilePropertiesPanel: () => {
  calls.properties()
  return null
} }))
vi.mock('../components/workspace/MobileWorkspaceSidebar', () => ({ MobileWorkspaceSidebar: (props: { onOpenCommandPalette?: () => void }) => {
  calls.sidebar(props)
  return createElement('button', { type: 'button', 'data-testid': 'sidebar-command-palette-action', onClick: props.onOpenCommandPalette })
} }))
vi.mock('../ui/theme/useMobileTheme', () => ({ useMobileStyles: () => ({ styles: { screen: {}, drawerRoot: {}, drawerPanel: {}, drawerScrim: {} } }) }))
vi.mock('../workspace/mobileWorkspaceEmptyState', () => ({ mobileWorkspaceHasNoVault: () => false }))
vi.mock('./usePhoneViewportWidth', () => ({ usePhoneViewportWidth: () => 390 }))
vi.mock('./PhoneScreenLayer', () => ({ PhoneScreenLayer: ({ children }: { children?: ReactNode }) => children }))
vi.mock('./PhoneWorkspaceChrome', () => ({
  PhoneBackButton: ({ onBack }: { onBack?: () => void }) =>
    createElement('button', { type: 'button', 'data-testid': 'phone-back-action', onClick: onBack }),
  PhoneSidebarButton: ({ onOpenSidebar }: { onOpenSidebar?: () => void }) =>
    createElement('button', { type: 'button', 'data-testid': 'phone-sidebar-action', onClick: onOpenSidebar }),
  PhoneTopBar: ({ children }: { children?: ReactNode }) => createElement('header', null, children),
}))
vi.mock('./TabletEditorPanel', () => ({ TabletEditorPanel: (props: Record<string, unknown>) => {
  calls.editor(props)
  return null
} }))
vi.mock('./useMobileInspectorReferenceGroups', () => ({ useMobileInspectorReferenceGroups: () => [] }))

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
const openCommandPalette = vi.fn()

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

it('provides native Android navigation controls: hamburger menu in list, back button in editor, and scrim in drawer', async () => {
  const openSidebar = vi.fn()
  const openList = vi.fn()
  const props = {
    ...createPhoneWorkspaceScreenProps(openCommandPalette),
    openList,
    openSidebar,
  }
  await act(async () => root.render(createElement(PhoneWorkspaceScreens, props)))

  expect(host.querySelector('[data-testid="sidebar-command-palette-action"]')).not.toBeNull()
  expect(calls.sidebar.mock.lastCall?.[0].onOpenCommandPalette).toBe(openCommandPalette)
  await act(async () => host.querySelector<HTMLButtonElement>('[data-testid="sidebar-command-palette-action"]')?.click())
  expect(openCommandPalette).toHaveBeenCalledOnce()

  // Leading hamburger button in note list
  expect(calls.list.mock.lastCall?.[0].leading).toBeDefined()
  const sidebarBtn = host.querySelector<HTMLButtonElement>('[data-testid="phone-sidebar-action"]')
  expect(sidebarBtn).not.toBeNull()
  await act(async () => sidebarBtn?.click())
  expect(openSidebar).toHaveBeenCalledOnce()

  // Leading back button in editor
  expect(calls.editor.mock.lastCall?.[0].leading).toBeDefined()
  expect(calls.editor.mock.lastCall?.[0].trailing).toBeUndefined()

  // Scrim in sidebar drawer
  const scrim = host.querySelector<HTMLButtonElement>('[data-testid="phone-sidebar-scrim"]')
  expect(scrim).not.toBeNull()
  await act(async () => scrim?.click())
  expect(openList).toHaveBeenCalledOnce()

  expect(calls.properties).toHaveBeenCalledOnce()
})
