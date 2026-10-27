import { Check, Copy } from "phosphor-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../components/ui/text";
import { copyDiagnosticsToClipboard } from "../diagnostics/mobileDiagnostics";
import { MobileButton } from "../ui/MobileButton";
import type { MobileMetrics } from "../ui/mobileMetrics";
import type { MobileColors } from "../ui/theme/mobilePalette";
import { useMobileStyles } from "../ui/theme/useMobileTheme";

export function MobileDiagnosticsSettings() {
	const { styles, mobileColors } = useMobileStyles(createStyles);
	const [copied, setCopied] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);

	const handleCopy = async () => {
		const result = await copyDiagnosticsToClipboard();
		setFeedback(result.message);
		if (result.success) {
			setCopied(true);
			setTimeout(() => setCopied(false), 3000);
		}
	};

	return (
		<View style={styles.section} testID="settings-diagnostics">
			<Text style={styles.heading}>Diagnose & Fehlerbericht</Text>
			<View style={styles.card}>
				<View style={styles.label}>
					<Text style={styles.title}>Diagnoseprotokoll exportieren</Text>
					<Text style={styles.detail}>
						Kopiert einen Diagnosebericht mit Gerätedetails, Dateisystem- und
						Vault-Status sowie den letzten System- und Fehlerprotokollen in die
						Zwischenablage.
					</Text>
				</View>
				<MobileButton
					label={copied ? "Bericht kopiert!" : "Fehlerbericht kopieren"}
					onPress={handleCopy}
					icon={
						copied ? (
							<Check size={16} color={mobileColors.green} />
						) : (
							<Copy size={16} color={mobileColors.text} />
						)
					}
				/>
				{feedback && (
					<Text style={copied ? styles.successText : styles.feedbackText}>
						{feedback}
					</Text>
				)}
			</View>
		</View>
	);
}

function createStyles(colors: MobileColors, metrics: MobileMetrics) {
	const styles = StyleSheet.create({
		card: {
			backgroundColor: colors.graySoft,
			borderRadius: 8,
			gap: metrics.size(12),
			padding: metrics.size(14),
		},
		detail: {
			color: colors.textMuted,
			fontSize: metrics.size(12),
			lineHeight: metrics.size(16),
		},
		feedbackText: { color: colors.textMuted, fontSize: metrics.size(12) },
		heading: {
			color: colors.text,
			fontSize: metrics.size(16),
			fontWeight: "600",
		},
		label: { gap: metrics.size(4) },
		section: { gap: metrics.size(12), paddingTop: metrics.size(12) },
		successText: {
			color: colors.green,
			fontSize: metrics.size(12),
			fontWeight: "500",
		},
		title: {
			color: colors.text,
			fontSize: metrics.size(14),
			fontWeight: "500",
		},
	});
	return { mobileColors: colors, styles };
}
