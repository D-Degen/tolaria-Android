import { useEffect, useLayoutEffect, useRef } from 'react'
import { BackHandler, Platform, ToastAndroid } from 'react-native'
import type { PhoneWorkspaceNavigation } from './PhoneWorkspace'
import type { PhoneWorkspaceState } from './phoneWorkspaceTransitions'

export type PhoneWorkspaceBackHandlerOptions = {
  phoneState: PhoneWorkspaceState
  navigation: Pick<PhoneWorkspaceNavigation, 'openEditor' | 'openList'>
  commandPaletteVisible?: boolean
  closeCommandPalette?: () => void
  openAction?: unknown
  closeAction?: () => void
  bulkSelectionActive?: boolean
  clearBulkSelection?: () => void
  searchQuery?: string
  clearSearch?: () => void
  neighborhood?: unknown
  canGoBack?: boolean
  goBack?: () => void
  isInbox?: boolean
  selectInbox?: () => void
  lastBackPressTime?: number
  onBackPressTimeUpdate?: (time: number) => void
  showExitToast?: () => void
}

export function handlePhoneWorkspaceBackPress(options: PhoneWorkspaceBackHandlerOptions): boolean {
  if (options.commandPaletteVisible && options.closeCommandPalette) {
    options.closeCommandPalette()
    return true
  }
  if (options.openAction && options.closeAction) {
    options.closeAction()
    return true
  }
  if (options.phoneState === 'properties') {
    options.navigation.openEditor()
    return true
  }
  if (options.phoneState === 'editor') {
    options.navigation.openList()
    return true
  }
  if (options.phoneState === 'sidebar') {
    options.navigation.openList()
    return true
  }
  if (options.phoneState === 'list') {
    if (options.bulkSelectionActive && options.clearBulkSelection) {
      options.clearBulkSelection()
      return true
    }
    if (options.searchQuery && options.clearSearch) {
      options.clearSearch()
      return true
    }
    if (options.neighborhood && options.goBack) {
      options.goBack()
      return true
    }
    if (options.canGoBack && options.goBack) {
      options.goBack()
      return true
    }
    if (options.isInbox === false && options.selectInbox) {
      options.selectInbox()
      return true
    }
    const now = Date.now()
    const lastTime = options.lastBackPressTime ?? 0
    if (now - lastTime < 2000) {
      return false
    }
    options.onBackPressTimeUpdate?.(now)
    options.showExitToast?.()
    return true
  }
  return false
}

export function usePhoneWorkspaceBackHandler(options: PhoneWorkspaceBackHandlerOptions) {
  const latest = useRef(options)
  const lastBackPressTimeRef = useRef(0)

  useLayoutEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    if (Platform.OS !== 'android') return

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const opts: PhoneWorkspaceBackHandlerOptions = {
        ...latest.current,
        lastBackPressTime: lastBackPressTimeRef.current,
        onBackPressTimeUpdate: (time: number) => {
          lastBackPressTimeRef.current = time
          latest.current.onBackPressTimeUpdate?.(time)
        },
        showExitToast: () => {
          if (latest.current.showExitToast) {
            latest.current.showExitToast()
          } else if (Platform.OS === 'android' && ToastAndroid?.show) {
            ToastAndroid.show('Erneut drücken zum Beenden', ToastAndroid.SHORT)
          }
        },
      }
      return handlePhoneWorkspaceBackPress(opts)
    })
    return () => {
      subscription.remove()
    }
  }, [])
}
