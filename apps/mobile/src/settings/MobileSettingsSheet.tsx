import {
	ArrowClockwise,
	ArrowLeft,
	Bell,
	GitBranch,
	ShieldCheck,
	Wrench,
} from "phosphor-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../components/ui/text";
import { MobileVaultManager } from "../components/vaults/MobileVaultManager";
import { mobileText } from "../i18n/mobileText";
import { MobileButton } from "../ui/MobileButton";
import type { MobileMetrics } from "../ui/mobileMetrics";
import type { MobileColors } from "../ui/theme/mobilePalette";
import { useMobileStyles } from "../ui/theme/useMobileTheme";
import type { useMobileVaults } from "../workspace/git/useMobileVaults";
import { useMobileModalDismiss } from "../workspace/useMobileModalDismiss";
import { MobileAppearanceSettings } from "./MobileAppearanceSettings";
import { MobileDeveloperSettings } from "./MobileDeveloperSettings";
import { MobileDiagnosticsSettings } from "./MobileDiagnosticsSettings";
import { MobileEditorSettings } from "./MobileEditorSettings";
import { MobilePrivacySettings } from "./MobilePrivacySettings";
import { MobileTaskNotificationSettings } from "./MobileTaskNotificationSettings";
import { MobileUpdateSettings } from "./MobileUpdateSettings";
import { SettingsCard } from "./SettingsCard";
import { useMobileSettings } from "./useMobileSettings";
import { useMobileUpdateChannel } from "./useMobileUpdateChannel";

export function MobileSettingsSheet({
	manager,
}: {
	manager: ReturnType<typeof useMobileVaults>;
}) {
	const { styles, mobileColors } = useMobileStyles(createThemeStyles);
	const insets = useSafeAreaInsets();
	const preferences = useMobileSettings();
	const updates = useMobileUpdateChannel(manager);
	const close = () => {
		if (manager.busy) return;
		manager.close();
		preferences.close();
	};
	const opened = preferences.opened || manager.opened;
	useMobileModalDismiss(close, opened);

	return (
		<Modal
			visible={opened}
			animationType="slide"
			onRequestClose={close}
			statusBarTranslucent
			supportedOrientations={[
				"portrait",
				"portrait-upside-down",
				"landscape-left",
				"landscape-right",
			]}
		>
			<View
				style={[
					styles.screen,
					{
						paddingTop: insets.top,
						paddingBottom: insets.bottom,
					},
				]}
				testID="mobile-settings"
			>
				{/* Top App Bar with native Android Back Navigation */}
				<View style={styles.topBar}>
					<Pressable
						accessibilityLabel={mobileText("settings.close")}
						accessibilityRole="button"
						hitSlop={8}
						style={styles.backButton}
						testID="settings-back-button"
						onPress={close}
					>
						<ArrowLeft size={22} color={mobileColors.text} weight="bold" />
					</Pressable>
					<Text style={styles.topBarTitle}>{mobileText("settings.title")}</Text>
					<View style={styles.topBarRightSpacer} />
				</View>

				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
				>
					{preferences.error && (
						<Text accessibilityRole="alert" style={styles.error}>
							{mobileText(
								preferences.error === "load"
									? "mobile.settings.loadFailed"
									: "mobile.settings.saveFailed",
							)}
						</Text>
					)}
					{preferences.error === "load" && (
						<MobileButton
							label={mobileText("pulse.retry")}
							onPress={() => {
								void preferences.retry();
							}}
						/>
					)}

					{/* 1. Tresor & Synchronisation */}
					<SettingsCard
						badgeBg="rgba(16, 185, 129, 0.15)"
						description="Verbundene Ordner, Git-Sync und GitHub-Repositories"
						icon={<GitBranch color="#10B981" size={18} weight="bold" />}
						testID="settings-vaults-card"
						title={mobileText("settings.workspaces.title")}
					>
						<MobileVaultManager manager={manager} />
					</SettingsCard>

					{!manager.conflictReview && (
						<>
							{/* 2. Erscheinungsbild (Theme-Vorschaukarten) */}
							<MobileAppearanceSettings />

							{/* 3. Editor & Notizen (Schriftgröße, Standardansicht) */}
							<MobileEditorSettings />

							{/* 4. Aufgaben-Erinnerungen */}
							<SettingsCard
								badgeBg="rgba(245, 158, 11, 0.15)"
								description="Fällige Aufgaben am Fälligkeitstag erinnern"
								icon={<Bell color="#F59E0B" size={18} weight="bold" />}
								testID="settings-notifications-card"
								title="Aufgaben-Erinnerungen"
							>
								<MobileTaskNotificationSettings />
							</SettingsCard>

							{/* 5. App-Aktualisierungen */}
							<SettingsCard
								badgeBg="rgba(59, 130, 246, 0.15)"
								description="Release-Kanal und automatische App-Aktualisierungen"
								icon={<ArrowClockwise color="#3B82F6" size={18} weight="bold" />}
								testID="settings-updates-card"
								title="App-Aktualisierungen"
							>
								<MobileUpdateSettings updates={updates} />
							</SettingsCard>

							{/* 6. Datenschutz & Telemetrie */}
							<SettingsCard
								badgeBg="rgba(6, 182, 212, 0.15)"
								description={mobileText("settings.privacy.description")}
								icon={<ShieldCheck color="#06B6D4" size={18} weight="bold" />}
								testID="settings-privacy-card"
								title={mobileText("settings.privacy.title")}
							>
								<MobilePrivacySettings />
							</SettingsCard>

							{/* 7. Diagnose & Entwickler-Optionen */}
							<SettingsCard
								badgeBg="rgba(100, 116, 139, 0.15)"
								description="Systemprotokolle, Fehleranalyse und Benachrichtigungstests"
								icon={<Wrench color="#64748B" size={18} weight="bold" />}
								testID="settings-diagnostics-card"
								title="Diagnose & Entwickler"
							>
								<MobileDiagnosticsSettings />
								<MobileDeveloperSettings />
							</SettingsCard>
						</>
					)}
				</ScrollView>
			</View>
		</Modal>
	);
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
	const styles = StyleSheet.create({
		screen: {
			flex: 1,
			backgroundColor: mobileColors.app,
		},
		topBar: {
			height: 56,
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: metrics.size(16),
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: mobileColors.border,
			backgroundColor: mobileColors.app,
			gap: metrics.size(12),
		},
		backButton: {
			width: 40,
			height: 40,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: 20,
		},
		topBarTitle: {
			fontSize: metrics.size(18),
			fontWeight: "600",
			color: mobileColors.text,
			flex: 1,
		},
		topBarRightSpacer: {
			width: 40,
		},
		content: {
			padding: metrics.size(16),
			gap: metrics.size(16),
			paddingBottom: metrics.size(40),
		},
		error: {
			fontSize: metrics.size(12),
			lineHeight: metrics.size(18),
			color: mobileColors.danger,
		},
	});
	return { mobileColors, styles };
}
