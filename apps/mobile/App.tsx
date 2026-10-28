import './global.css'
import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { PortalHost } from '@rn-primitives/portal'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { MobileUiLab } from './src/screens/MobileUiLab'
import { MobileThemeProvider } from './src/ui/theme/MobileThemeProvider'
import { useMobileTheme } from './src/ui/theme/useMobileTheme'
import { useNativeGitProbe } from './src/qa/nativeGitProbe'
import { MobileVaultProvider } from './src/workspace/MobileVaultProvider'
import { MobileSettingsProvider } from './src/settings/MobileSettingsProvider'
import { MobileAnalyticsProvider } from './src/analytics/MobileAnalyticsProvider'
import { logDiagnostic } from './src/diagnostics/mobileDiagnostics'
import Constants from 'expo-constants'
import { nativeApplicationVersion, nativeBuildVersion } from 'expo-application'

const appMountTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now()

export function App() {
  useNativeGitProbe()
  useEffect(() => {
    const startupDurationMs = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - appMountTimestamp,
    )
    const version = nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.2.6'
    const build = nativeBuildVersion ?? Constants.expoConfig?.android?.versionCode ?? 8
    logDiagnostic(
      'info',
      'lifecycle',
      `Tolaria Mobile initialized (v${version} build ${build}) in ${startupDurationMs}ms`,
    )
  }, [])
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MobileSettingsProvider>
        <MobileAnalyticsProvider><MobileThemeProvider><AppSurface /></MobileThemeProvider></MobileAnalyticsProvider>
      </MobileSettingsProvider>
    </GestureHandlerRootView>
  )
}

function AppSurface() {
  const { colors, mode } = useMobileTheme()
  return (
      <SafeAreaProvider>
        <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: colors.app, flex: 1 }}>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <MobileVaultProvider><MobileUiLab /></MobileVaultProvider>
        </SafeAreaView>
        <PortalHost />
      </SafeAreaProvider>
  )
}
