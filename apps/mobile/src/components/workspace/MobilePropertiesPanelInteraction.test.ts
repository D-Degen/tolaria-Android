// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MobilePropertiesPanel } from './MobilePropertiesPanel'
import { workspaceScenarioForId } from '../../fixtures/workspaceFixtures'
import { mobileMetrics } from '../../ui/mobileMetrics'
import { mobilePalettes } from '../../ui/theme/mobilePalette'

type Props = { children?: ReactNode; testID?: string; onPress?: () => void; label?: string; value?: ReactNode }
function Surface(props: Props) {
  return createElement('div', { 'data-testid': props.testID }, props.children)
}
function Control(props: Props) {
  return createElement('button', { type: 'button', 'data-testid': props.testID, onClick: props.onPress }, props.children)
}
function PropertyRow(props: Props) {
  return createElement(props.onPress ? Control : Surface, props, props.label, props.value)
}
const layout = vi.hoisted(() => ({ device: 'tablet' }))
vi.mock('react-native', () => ({ View: Surface, ScrollView: Surface, Pressable: Control,
  StyleSheet: { create: (styles: object) => styles, hairlineWidth: 0.5 } }))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }))
vi.mock('phosphor-react-native', () => ({
  Archive: () => null,
  ArrowsInLineHorizontal: () => null,
  ArrowsOutLineHorizontal: () => null,
  CalendarBlank: () => null,
  CaretDown: () => null,
  CaretRight: () => null,
  CircleIcon: () => null,
  Clock: () => null,
  Code: () => null,
  Copy: () => null,
  FilePdf: () => null,
  Folder: () => null,
  LinkSimple: () => null,
  ListBullets: () => null,
  MagnifyingGlass: () => null,
  MapTrifold: () => null,
  PencilSimple: () => null,
  Plus: () => createElement('span', { 'data-plus': true }, '+'),
  Shapes: () => null,
  Star: () => null,
  Tag: () => null,
  Trash: () => null,
  WarningCircle: () => null,
  X: () => null,
}))
vi.mock('../../ui/theme/useMobileTheme', () => ({ useMobileColors: () => mobilePalettes.light,
  useMobileStyles: (factory: (colors: typeof mobilePalettes.light, metrics: typeof mobileMetrics[1.2]) => object) => factory(mobilePalettes.light, mobileMetrics[1.2]) }))
vi.mock('../../ui/useMobileDeviceLayout', () => ({ useMobileDeviceLayout: () => layout.device }))
vi.mock('../../qa/mobileLayoutProbe', () => ({ useMobileLayoutProbe: () => ({ probe: () => ({}) }), probeProps: () => ({}) }))
vi.mock('../../ui/MobilePanel', () => ({ MobilePanel: Surface, MobileToolbar: Surface, MobileToolbarSpacer: () => null, MobileToolbarTitle: () => null }))
vi.mock('../../ui/MobileIconButton', () => ({ MobileIconButton: Control }))
vi.mock('../../ui/MobilePropertyRow', () => ({ MobilePropertyRow: PropertyRow }))
vi.mock('../ui/text', () => ({ Text: Surface }))
vi.mock('./MobileWorkspaceIcons', () => ({ MobileTypeIcon: () => null }))
vi.mock('./MobileFrontmatterStateNotice', () => ({ MobileFrontmatterStateNotice: () => null }))
vi.mock('./MobilePropertyValues', () => ({ EditableChipValue: () => null, EditableTagsValue: () => null,
  EditablePropertyRow: () => null, WorkspaceBadge: () => null }))

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

it.each(['phone', 'tablet'])('places add-property before relationships on %s', async device => {
  await render(device)
  const property = host.querySelector('[data-testid="property-action-add-property"]')
  const relationship = host.querySelector('[data-testid="property-section-belongsTo"]')
  expect(property).not.toBeNull()
  expect(relationship).not.toBeNull()
  if (!property || !relationship) throw new Error('Property actions or relationships are missing')
  expect(property.compareDocumentPosition(relationship)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
})

it.each(['phone', 'tablet'])('uses only a plus for empty property values on %s', async device => {
  const onAddProperty = await render(device)
  const placeholder = host.querySelector<HTMLButtonElement>('[data-testid="property-placeholder-suggested-status"]')
  expect(placeholder?.textContent).toBe('Status+')
  await act(async () => placeholder?.click())
  expect(onAddProperty).toHaveBeenCalledExactlyOnceWith('Status')
})

it('renders quick action buttons and file management actions when provided', async () => {
  layout.device = 'phone'
  const note = { ...workspaceScenarioForId('default').notes[0], status: '', rawContent: '---\ntype: Essay\n---\n# Test\n' }
  const onToggleFavorite = vi.fn()
  const onOpenFindInNote = vi.fn()
  const onOpenTableOfContents = vi.fn()
  const onToggleNoteWidth = vi.fn()
  const onSetArchived = vi.fn()
  const onToggleRawEditor = vi.fn()
  const onDeleteNote = vi.fn()
  const callback = vi.fn()

  await act(async () => root.render(createElement(MobilePropertiesPanel, {
    compact: false, showToolbar: false, note,
    onAddProperty: callback, onAddRelationship: callback, onDeleteProperty: callback, onEditProperty: callback,
    onInitializeProperties: callback, onCreateMissingType: callback, onOpenChangeNoteType: callback,
    onRemoveRelationship: callback, onSelectNote: callback,
    onToggleFavorite, onOpenFindInNote, onOpenTableOfContents, onToggleNoteWidth,
    onSetArchived, onToggleRawEditor, onDeleteNote,
  })))

  const favBtn = host.querySelector<HTMLButtonElement>('[data-testid="properties-action-favorite"]')
  expect(favBtn).not.toBeNull()
  await act(async () => favBtn?.click())
  expect(onToggleFavorite).toHaveBeenCalledOnce()

  const findBtn = host.querySelector<HTMLButtonElement>('[data-testid="properties-action-find"]')
  expect(findBtn).not.toBeNull()
  await act(async () => findBtn?.click())
  expect(onOpenFindInNote).toHaveBeenCalledOnce()

  const tocBtn = host.querySelector<HTMLButtonElement>('[data-testid="properties-action-toc"]')
  expect(tocBtn).not.toBeNull()
  await act(async () => tocBtn?.click())
  expect(onOpenTableOfContents).toHaveBeenCalledOnce()

  const widthBtn = host.querySelector<HTMLButtonElement>('[data-testid="properties-action-width"]')
  expect(widthBtn).not.toBeNull()
  await act(async () => widthBtn?.click())
  expect(onToggleNoteWidth).toHaveBeenCalledOnce()

  const archiveBtn = host.querySelector<HTMLButtonElement>('[data-testid="properties-action-archive"]')
  expect(archiveBtn).not.toBeNull()
  await act(async () => archiveBtn?.click())
  expect(onSetArchived).toHaveBeenCalledOnce()

  const sourceBtn = host.querySelector<HTMLButtonElement>('[data-testid="properties-action-source-mode"]')
  expect(sourceBtn).not.toBeNull()
  await act(async () => sourceBtn?.click())
  expect(onToggleRawEditor).toHaveBeenCalledOnce()

  const deleteBtn = host.querySelector<HTMLButtonElement>('[data-testid="workspace-action-delete-note"]')
  expect(deleteBtn).not.toBeNull()
  await act(async () => deleteBtn?.click())
  expect(onDeleteNote).toHaveBeenCalledOnce()
})

async function render(device: string) {
  layout.device = device
  const note = { ...workspaceScenarioForId('default').notes[0], status: '', rawContent: '---\ntype: Essay\n---\n# Test\n' }
  const onAddProperty = vi.fn()
  const callback = vi.fn()
  await act(async () => root.render(createElement(MobilePropertiesPanel, {
    compact: false, showToolbar: false, note, onAddProperty,
    onAddRelationship: callback, onDeleteProperty: callback, onEditProperty: callback,
    onInitializeProperties: callback, onCreateMissingType: callback, onOpenChangeNoteType: callback,
    onRemoveRelationship: callback, onSelectNote: callback,
  })))
  return onAddProperty
}
