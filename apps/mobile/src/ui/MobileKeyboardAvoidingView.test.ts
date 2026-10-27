// @vitest-environment jsdom
import { act, createElement, useImperativeHandle, type CSSProperties, type ReactNode, type Ref } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MobileKeyboardAvoidingView } from './MobileKeyboardAvoidingView'

const native = vi.hoisted(() => ({
  os: 'ios', top: 80, height: 800, keyboardY: 500 as number | undefined,
  listeners: new Map<string, (event: { endCoordinates: { screenY: number } }) => void>(),
}))
type SurfaceProps = { children?: ReactNode; style?: CSSProperties | CSSProperties[]; onLayout?: () => void }
function flatStyle(style: SurfaceProps['style']) { return Object.assign({}, ...[style].flat()) }
type Measure = (x: number, y: number, width: number, height: number) => void
function Host({ children, style, onLayout, ref }: SurfaceProps & { ref?: Ref<{ measureInWindow: (measure: Measure) => void }> }) {
  useImperativeHandle(ref, () => ({ measureInWindow: (measure: (x: number, y: number, width: number, height: number) => void) => {
    measure(0, native.top, 390, native.height)
  } }))
  return createElement('div', { style: flatStyle(style), onClick: onLayout, 'data-host': true }, children)
}
vi.mock('react-native', () => ({
  View: Host,
  KeyboardAvoidingView: ({ children, enabled }: SurfaceProps & { enabled?: boolean }) =>
    createElement('section', { 'data-enabled': enabled !== false }, children),
  Platform: { get OS() { return native.os } },
  StyleSheet: { create: (value: object) => value },
  Keyboard: {
    metrics: () => native.keyboardY === undefined ? undefined : { screenY: native.keyboardY },
    addListener: (event: string, listener: (event: { endCoordinates: { screenY: number } }) => void) => {
      native.listeners.set(event, listener)
      return { remove: () => native.listeners.delete(event) }
    },
    scheduleLayoutAnimation: vi.fn(),
  },
}))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 59 }) }))

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Object.assign(native, { os: 'ios', top: 80, height: 800, keyboardY: 500 })
})
afterEach(async () => {
  await act(async () => root?.unmount())
  expect(native.listeners.size).toBe(0)
  vi.unstubAllGlobals()
})

it('keeps a newly mounted editor above an already visible keyboard until it hides', async () => {
  const host = await mount()
  expect(padding(host)).toBe(380)
  expect(host.querySelector('section')?.getAttribute('data-enabled')).toBe('false')
  await emit('keyboardWillShow', 450)
  expect(padding(host)).toBe(430)
  await emit('keyboardWillHide', 880)
  expect(padding(host)).toBe(0)
  expect(host.querySelector('section')?.getAttribute('data-enabled')).toBe('false')
})

it('recomputes inherited avoidance when the pane moves or rotates', async () => {
  const host = await mount()
  native.top = 40
  native.height = 400
  await act(async () => host.querySelector<HTMLElement>('[data-host]')?.click())
  expect(padding(host)).toBe(0)
  await emit('keyboardWillShow', 280)
  expect(padding(host)).toBe(160)
})

it('catches a keyboard that finishes appearing after the editor mounts', async () => {
  native.keyboardY = undefined
  const host = await mount()
  await emit('keyboardDidShow', 500)
  expect(padding(host)).toBe(380)
  await emit('keyboardWillHide', 880)
  expect(padding(host)).toBe(0)
})

it('leaves keyboard sizing to the platform on web', async () => {
  native.os = 'web'
  const host = await mount()
  expect(padding(host)).toBe(0)
  expect(native.listeners.size).toBe(0)
})

it.each([undefined, 0])('does not collapse a pane without a usable inherited keyboard frame (%s)', async keyboardY => {
  native.keyboardY = keyboardY
  const host = await mount()
  expect(padding(host)).toBe(0)
})

async function mount() {
  const host = document.createElement('div')
  root = createRoot(host)
  await act(async () => root?.render(createElement(MobileKeyboardAvoidingView, null, 'Editor')))
  await act(async () => host.querySelector<HTMLElement>('[data-host]')?.click())
  return host
}
function padding(host: HTMLElement) {
  const padded = [...host.querySelectorAll<HTMLElement>('[data-host]')].map(view => Number.parseFloat(view.style.paddingBottom || '0'))
  return Math.max(0, ...padded)
}
function emit(name: string, screenY: number) {
  return act(async () => native.listeners.get(name)?.({ endCoordinates: { screenY } }))
}
