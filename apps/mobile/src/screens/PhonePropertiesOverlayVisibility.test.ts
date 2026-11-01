// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PhoneWorkspaceScreens } from './PhoneWorkspaceScreens'
import { createPhoneWorkspaceScreenProps } from './PhoneWorkspaceScreens.testSupport'

const calls = vi.hoisted(() => ({ properties: vi.fn(), editor: vi.fn() }))

vi.mock('react-native', () => ({
  View: ({ children, testID, pointerEvents }: { children?: ReactNode; testID?: string; pointerEvents?: string }) =>
    createElement('div', { 'data-testid': testID, 'data-pointer-events': pointerEvents }, children),
  Pressable: ({ children, testID, onPress }: { children?: ReactNode; testID?: string; onPress?: () => void }) =>
    createElement('button', { type: 'button', 'data-testid': testID, onClick: onPress }, children),
  StyleSheet: { create: (styles: object) => styles, hairlineWidth: 1 },
}))

vi.mock('../components/workspace/MobileNoteListPanel', () => ({ MobileNoteListPanel: () => null }))
vi.mock('../components/workspace/MobileTaskListPanel', () => ({ MobileTaskListPanel: () => null }))
vi.mock('../components/workspace/MobilePropertiesPanel', () => ({
  MobilePropertiesPanel: () => {
    calls.properties()
    return null
  },
}))
vi.mock('../components/workspace/MobileWorkspaceSidebar', () => ({ MobileWorkspaceSidebar: () => null }))
vi.mock('../ui/theme/useMobileTheme', () => ({
  useMobileStyles: () => ({
    mobileColors: { card: '#fff', border: '#ccc', app: '#f0f0f0', text: '#000' },
    styles: { screen: {}, drawerRoot: {}, drawerPanel: {}, drawerScrim: {}, propertiesDrawerRoot: {}, propertiesDrawerPanel: {} },
  }),
}))
vi.mock('../workspace/mobileWorkspaceEmptyState', () => ({ mobileWorkspaceHasNoVault: () => false }))
vi.mock('./usePhoneViewportWidth', () => ({ usePhoneViewportWidth: () => 390 }))
vi.mock('./PhoneWorkspaceChrome', () => ({
  PhoneBackButton: ({ onBack }: { onBack?: () => void }) =>
    createElement('button', { type: 'button', 'data-testid': 'phone-back-action', onClick: onBack }),
  PhonePropertiesButton: ({ onOpenProperties }: { onOpenProperties?: () => void }) =>
    createElement('button', { type: 'button', 'data-testid': 'editor-properties-action', onClick: onOpenProperties }),
  PhoneSidebarButton: ({ onOpenSidebar }: { onOpenSidebar?: () => void }) =>
    createElement('button', { type: 'button', 'data-testid': 'phone-sidebar-action', onClick: onOpenSidebar }),
  PhoneTopBar: ({ children }: { children?: ReactNode }) => createElement('header', null, children),
}))
vi.mock('./TabletEditorPanel', () => ({
  TabletEditorPanel: (props: Record<string, unknown>) => {
    calls.editor(props)
    return createElement('div', { 'data-testid': 'tablet-editor-panel' })
  },
}))
vi.mock('./useMobileInspectorReferenceGroups', () => ({ useMobileInspectorReferenceGroups: () => [] }))

describe('PhonePropertiesOverlayVisibility', () => {
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

  it('keeps properties panel completely unmounted and hidden by default when opening note editor', async () => {
    const openEditor = vi.fn()
    const openProperties = vi.fn()

    const props = {
      ...createPhoneWorkspaceScreenProps(() => {}),
      phoneState: 'editor' as const,
      openEditor,
      openProperties,
    }

    await act(async () => root.render(createElement(PhoneWorkspaceScreens, props)))

    // Properties screen and scrim MUST NOT exist when phoneState is 'editor'
    expect(host.querySelector('[data-testid="phone-properties-screen"]')).toBeNull()
    expect(host.querySelector('[data-testid="phone-properties-scrim"]')).toBeNull()
    expect(calls.properties).not.toHaveBeenCalled()

    // Editor MUST be rendered
    expect(host.querySelector('[data-testid="phone-editor-screen"]')).not.toBeNull()
  })

  it('renders properties drawer and scrim as an overlay only when phoneState is properties', async () => {
    const openEditor = vi.fn()

    const props = {
      ...createPhoneWorkspaceScreenProps(() => {}),
      phoneState: 'properties' as const,
      openEditor,
    }

    await act(async () => root.render(createElement(PhoneWorkspaceScreens, props)))

    // Properties drawer and scrim MUST exist
    const propertiesScreen = host.querySelector('[data-testid="phone-properties-screen"]')
    expect(propertiesScreen).not.toBeNull()

    const scrim = host.querySelector<HTMLButtonElement>('[data-testid="phone-properties-scrim"]')
    expect(scrim).not.toBeNull()

    // Clicking scrim closes properties and returns to editor
    await act(async () => scrim?.click())
    expect(openEditor).toHaveBeenCalledOnce()
  })
})
