import { X } from "phosphor-react-native";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
} from "react-native";
import { Text } from "../components/ui/text";
import { MobileVaultManager } from "../components/vaults/MobileVaultManager";
import { mobileText } from "../i18n/mobileText";
import { MobileButton } from "../ui/MobileButton";
import { MobileIconButton } from "../ui/MobileIconButton";
import {
	MobilePanel,
	MobileToolbar,
	MobileToolbarSpacer,
	MobileToolbarTitle,
} from "../ui/MobilePanel";
import type { MobileMetrics } from "../ui/mobileMetrics";
import type { MobileColors } from "../ui/theme/mobilePalette";
import { useMobileStyles } from "../ui/theme/useMobileTheme";
import type { useMobileVaults } from "../workspace/git/useMobileVaults";
import { useMobileModalDismiss } from "../workspace/useMobileModalDismiss";
import { MobileAppearanceSettings } from "./MobileAppearanceSettings";
import { MobileDeveloperSettings } from "./MobileDeveloperSettings";
import { MobileDiagnosticsSettings } from "./MobileDiagnosticsSettings";
import { MobilePrivacySettings } from "./MobilePrivacySettings";
import { MobileTaskNotificationSettings } from "./MobileTaskNotificationSettings";
import { MobileUpdateSettings } from "./MobileUpdateSettings";
import { useMobileSettings } from "./useMobileSettings";
import { useMobileUpdateChannel } from "./useMobileUpdateChannel";

export function MobileSettingsSheet({
	manager,
}: {
	manager: ReturnType<typeof useMobileVaults>;
}) {
	const { styles, mobileColors } = useMobileStyles(createThemeStyles);
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
			transparent
			animationType="fade"
			onRequestClose={close}
			supportedOrientations={[
				"portrait",
				"portrait-upside-down",
				"landscape-left",
				"landscape-right",
			]}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={styles.backdrop}
			>
				<MobilePanel
					style={styles.panel}
					accessibilityViewIsModal
					testID="mobile-settings"
				>
					<MobileToolbar>
						<MobileToolbarTitle title={mobileText("settings.title")} />
						<MobileToolbarSpacer />
						<MobileIconButton
							accessibilityLabel={mobileText("settings.close")}
							onPress={close}
						>
							<X size={18} color={mobileColors.textMuted} />
						</MobileIconButton>
					</MobileToolbar>
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
						<MobileVaultManager manager={manager} />
						{!manager.conflictReview && (
							<>
								<MobileAppearanceSettings />
								<MobileTaskNotificationSettings />
								<MobileUpdateSettings updates={updates} />
								<MobilePrivacySettings />
								<MobileDiagnosticsSettings />
								<MobileDeveloperSettings />
							</>
						)}
					</ScrollView>
				</MobilePanel>
			</KeyboardAvoidingView>
		</Modal>
	);
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
	const { space: mobileSpace } = metrics;
	const styles = StyleSheet.create({
		backdrop: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: mobileColors.overlay,
			padding: mobileSpace.lg,
		},
		panel: {
			width: "100%",
			maxWidth: 540,
			maxHeight: "85%",
			borderRadius: 8,
			overflow: "hidden",
			backgroundColor: mobileColors.dialog,
		},
		content: { padding: metrics.size(20), gap: metrics.size(20) },
		error: {
			fontSize: metrics.size(12),
			lineHeight: metrics.size(18),
			color: mobileColors.danger,
		},
	});
	return { mobileColors, styles };
}
