import "./global.css";
import { PortalHost } from "@rn-primitives/portal";
import { nativeApplicationVersion, nativeBuildVersion } from "expo-application";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { MobileAnalyticsProvider } from "./src/analytics/MobileAnalyticsProvider";
import { logDiagnostic } from "./src/diagnostics/mobileDiagnostics";
import { useNativeGitProbe } from "./src/qa/nativeGitProbe";
import { MobileUiLab } from "./src/screens/MobileUiLab";
import { MobileSettingsProvider } from "./src/settings/MobileSettingsProvider";
import { MobileThemeProvider } from "./src/ui/theme/MobileThemeProvider";
import { useMobileTheme } from "./src/ui/theme/useMobileTheme";
import { MobileVaultProvider } from "./src/workspace/MobileVaultProvider";
import { setupMobileNotifications } from "./src/workspace/mobileTaskNotifications";

const appMountTimestamp =
	typeof performance !== "undefined" ? performance.now() : Date.now();

export function App() {
	useNativeGitProbe();
	useEffect(() => {
		void setupMobileNotifications();
		const startupDurationMs = Math.round(
			(typeof performance !== "undefined" ? performance.now() : Date.now()) -
				appMountTimestamp,
		);
		const version =
			nativeApplicationVersion ?? Constants.expoConfig?.version ?? "0.2.6";
		const build =
			nativeBuildVersion ?? Constants.expoConfig?.android?.versionCode ?? 8;
		logDiagnostic(
			"info",
			"lifecycle",
			`Tolaria Mobile initialized (v${version} build ${build}) in ${startupDurationMs}ms`,
		);
	}, []);
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<MobileSettingsProvider>
				<MobileAnalyticsProvider>
					<MobileThemeProvider>
						<AppSurface />
					</MobileThemeProvider>
				</MobileAnalyticsProvider>
			</MobileSettingsProvider>
		</GestureHandlerRootView>
	);
}

function AppSurface() {
	const { colors, mode } = useMobileTheme();
	return (
		<SafeAreaProvider>
			<SafeAreaView
				edges={["left", "right"]}
				style={{ backgroundColor: colors.app, flex: 1 }}
			>
				<StatusBar style={mode === "dark" ? "light" : "dark"} />
				<MobileVaultProvider>
					<MobileUiLab />
				</MobileVaultProvider>
			</SafeAreaView>
			<PortalHost />
		</SafeAreaProvider>
	);
}
