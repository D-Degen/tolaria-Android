import { useEffect, useLayoutEffect, useRef } from 'react'
import { BackHandler, Platform } from 'react-native'
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
  goBack?: () => void
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
    return false
  }
  return false
}

export function usePhoneWorkspaceBackHandler(options: PhoneWorkspaceBackHandlerOptions) {
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    if (Platform.OS !== 'android') return

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return handlePhoneWorkspaceBackPress(latest.current)
    })
    return () => {
      subscription.remove()
    }
  }, [])
}
