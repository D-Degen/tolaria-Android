import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View, type KeyboardEvent, type LayoutChangeEvent, type ViewProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Keep nested tablet surfaces in the keyboard's screen-coordinate space. */
export function MobileKeyboardAvoidingView({ children, onLayout, ...props }: ViewProps) {
  const host = useRef<View>(null)
  const [frame, setFrame] = useState({ top: 0, height: 0 })
  const keyboard = useIosKeyboardFrame()
  const overlap = keyboard?.screenY
    ? Math.min(frame.height, Math.max(0, frame.top + frame.height - keyboard.screenY)) : 0
  const insets = useSafeAreaInsets()
  const measureOrigin = useCallback((event: LayoutChangeEvent) => {
    host.current?.measureInWindow((_x, top, _width, height) => setFrame({ top, height }))
    onLayout?.(event)
  }, [onLayout])

  return (
    <View {...props} ref={host} collapsable={false} onLayout={measureOrigin}>
      <View style={[styles.content, { paddingBottom: overlap }]}>
        <KeyboardAvoidingView
          enabled={Platform.OS !== 'ios'}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={frame.top}
          style={[styles.content, { paddingTop: Math.max(0, insets.top - frame.top) }]}
        >
          {children}
        </KeyboardAvoidingView>
      </View>
    </View>
  )
}

/** Cover both an already visible keyboard and events racing the editor's mount. */
function useIosKeyboardFrame() {
  const [keyboard, setKeyboard] = useState(() => (Platform.OS !== 'web' ? Keyboard.metrics() : undefined))
  useEffect(() => {
    if (Platform.OS === 'web') return
    const show = (event: KeyboardEvent) => {
      try {
        Keyboard.scheduleLayoutAnimation(event)
      } catch {
        // Fallback if layout animation is unsupported
      }
      setKeyboard(event.endCoordinates)
    }
    const hide = (event: KeyboardEvent) => {
      try {
        Keyboard.scheduleLayoutAnimation(event)
      } catch {
        // Fallback
      }
      setKeyboard(undefined)
    }
    const listeners = [
      Keyboard.addListener('keyboardWillChangeFrame', show),
      Keyboard.addListener('keyboardDidShow', show),
      Keyboard.addListener('keyboardWillShow', show),
      Keyboard.addListener('keyboardDidHide', hide),
      Keyboard.addListener('keyboardWillHide', hide),
    ]
    return () => {
      for (const listener of listeners) listener.remove()
    }
  }, [])
  return keyboard
}

const styles = StyleSheet.create({ content: { flex: 1, minHeight: 0 } })
