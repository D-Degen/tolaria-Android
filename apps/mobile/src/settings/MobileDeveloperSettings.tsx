import { Bell, Check, Clock, Trash } from "phosphor-react-native";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Text } from "../components/ui/text";
import { MobileButton } from "../ui/MobileButton";
import type { MobileMetrics } from "../ui/mobileMetrics";
import type { MobileColors } from "../ui/theme/mobilePalette";
import { useMobileColors, useMobileStyles } from "../ui/theme/useMobileTheme";

async function getNotificationsModule() {
	try {
		return await import("expo-notifications");
	} catch {
		return null;
	}
}

function computeFutureTarget(secondsInFuture: number): {
	targetTime: Date;
	timeString: string;
} {
	const targetTime = new Date(Date.now() + secondsInFuture * 1000);
	const timeString = `${String(targetTime.getHours()).padStart(2, "0")}:${String(targetTime.getMinutes()).padStart(2, "0")}:${String(targetTime.getSeconds()).padStart(2, "0")}`;
	return { targetTime, timeString };
}

export function MobileDeveloperSettings() {
	const colors = useMobileColors();
	const styles = useMobileStyles(createStyles);
	const [permissionStatus, setPermissionStatus] =
		useState<string>("Noch nicht geprüft");
	const [scheduledCount, setScheduledCount] = useState<number | null>(null);
	const [scheduledList, setScheduledList] = useState<
		Array<{ id: string; title: string; triggerDesc: string }>
	>([]);
	const [feedback, setFeedback] = useState<string | null>(null);

	const checkOrRequestPermissions = async () => {
		setFeedback(null);
		try {
			const Notifications = await getNotificationsModule();
			if (!Notifications) {
				setPermissionStatus("Nicht verfügbar");
				setFeedback("expo-notifications nicht verfügbar.");
				return;
			}
			const existing = await Notifications.getPermissionsAsync();
			if (existing.granted) {
				setPermissionStatus("Erteilt ✅");
				setFeedback("Berechtigung ist bereits erteilt!");
				return;
			}
			const response = await Notifications.requestPermissionsAsync();
			setPermissionStatus(
				response.granted ? "Erteilt ✅" : `Abgelehnt (${response.status}) ❌`,
			);
			setFeedback(
				response.granted
					? "Berechtigung erfolgreich erteilt!"
					: "Berechtigung wurde nicht erteilt.",
			);
		} catch (err) {
			setFeedback(
				`Fehler bei Berechtigungsabfrage: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	const triggerTestNotification = async (seconds: number) => {
		setFeedback(null);
		try {
			const Notifications = await getNotificationsModule();
			if (!Notifications) {
				setFeedback("expo-notifications nicht verfügbar.");
				return;
			}

			if (Platform.OS === "android") {
				await Notifications.setNotificationChannelAsync("tasks", {
					importance: Notifications.AndroidImportance.HIGH,
					name: "Aufgaben-Erinnerungen",
					sound: "default",
				});
			}

			const id = await Notifications.scheduleNotificationAsync({
				content: {
					title: `Tolaria Test-Erinnerung (${seconds}s)`,
					body: `Dies ist eine Test-Benachrichtigung (geplant für +${seconds} Sekunden).`,
					sound: "default",
				},
				trigger: {
					type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
					seconds,
					channelId: "tasks",
				},
			});

			setFeedback(`Alarm erfolgreich für in ${seconds}s geplant (ID: ${id})`);
			void refreshScheduled();
		} catch (err) {
			setFeedback(
				`Fehler beim Senden: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	const triggerExactDateNotification = async (secondsInFuture: number) => {
		setFeedback(null);
		try {
			const Notifications = await getNotificationsModule();
			if (!Notifications) {
				setFeedback("expo-notifications nicht verfügbar.");
				return;
			}

			if (Platform.OS === "android") {
				await Notifications.setNotificationChannelAsync("tasks", {
					enableVibrate: true,
					importance: Notifications.AndroidImportance.HIGH,
					name: "Aufgaben-Erinnerungen",
					sound: "default",
					vibrationPattern: [0, 250, 250, 250],
				});
			}

			const { targetTime, timeString } = computeFutureTarget(secondsInFuture);

			const id = await Notifications.scheduleNotificationAsync({
				content: {
					body: `Geplanter Uhrzeit-Alarm für ${timeString} wurde ausgelöst.`,
					sound: "default",
					title: `Tolaria Uhrzeit-Test (${timeString})`,
				},
				trigger: {
					channelId: "tasks",
					date: targetTime,
					type: Notifications.SchedulableTriggerInputTypes.DATE,
				} as unknown as Parameters<
					typeof Notifications.scheduleNotificationAsync
				>[0]["trigger"],
			});

			setFeedback(
				`Uhrzeit-Alarm für ${timeString} geplant (in ${secondsInFuture}s, ID: ${id})`,
			);
			void refreshScheduled();
		} catch (err) {
			setFeedback(
				`Fehler beim Planen des Uhrzeit-Alarms: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	const refreshScheduled = async () => {
		try {
			const Notifications = await getNotificationsModule();
			if (!Notifications) return;
			const list = await Notifications.getAllScheduledNotificationsAsync();
			setScheduledCount(list.length);
			setScheduledList(
				list.slice(0, 5).map((item) => ({
					id: item.identifier,
					title: item.content.title ?? "(Kein Titel)",
					triggerDesc: JSON.stringify(item.trigger ?? {}),
				})),
			);
		} catch {
			// Ignore
		}
	};

	const clearAllScheduled = async () => {
		setFeedback(null);
		try {
			const Notifications = await getNotificationsModule();
			if (!Notifications) return;
			await Notifications.cancelAllScheduledNotificationsAsync();
			setFeedback("Alle geplanten Benachrichtigungen wurden gelöscht.");
			void refreshScheduled();
		} catch (err) {
			setFeedback(
				`Fehler beim Löschen: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	return (
		<View style={styles.section} testID="settings-developer-section">
			<Text style={styles.heading}>Entwickler & Benachrichtigungs-Tests</Text>
			<View style={styles.card}>
				<View style={styles.row}>
					<Text style={styles.title}>Android Berechtigung:</Text>
					<Text
						style={[styles.detail, { fontWeight: "600", color: colors.text }]}
					>
						{permissionStatus}
					</Text>
				</View>

				<MobileButton
					icon={<Bell size={16} color={colors.text} />}
					label="Berechtigung prüfen & anfragen"
					onPress={checkOrRequestPermissions}
				/>

				<View style={styles.divider} />

				<Text style={styles.title}>Test-Mitteilungen auslösen:</Text>
				<View style={styles.actionsRow}>
					<MobileButton
						icon={<Clock size={16} color={colors.text} />}
						label="In 2s auslösen"
						onPress={() => void triggerTestNotification(2)}
					/>
					<MobileButton
						icon={<Clock size={16} color={colors.text} />}
						label="In 15s (Hintergrund)"
						onPress={() => void triggerTestNotification(15)}
					/>
					<MobileButton
						icon={<Clock size={16} color={colors.text} />}
						label="In 1 Min (Uhrzeit-Alarm)"
						onPress={() => void triggerExactDateNotification(60)}
					/>
				</View>

				<View style={styles.divider} />

				<View style={styles.row}>
					<Text style={styles.title}>Im System registrierte Alarme:</Text>
					<Text
						style={[
							styles.detail,
							{ fontWeight: "600", color: colors.primary },
						]}
					>
						{scheduledCount === null
							? "Noch nicht geladen"
							: `${scheduledCount} aktiv`}
					</Text>
				</View>

				<View style={styles.actionsRow}>
					<MobileButton
						icon={<Check size={16} color={colors.text} />}
						label="Alarme abfragen"
						onPress={refreshScheduled}
					/>
					<MobileButton
						icon={<Trash size={16} color={colors.danger} />}
						label="Alle Alarme leeren"
						onPress={clearAllScheduled}
					/>
				</View>

				{scheduledList.length > 0 ? (
					<View style={styles.listContainer}>
						{scheduledList.map((item) => (
							<View key={item.id} style={styles.listItem}>
								<Text numberOfLines={1} style={styles.itemTitle}>
									{`• ${item.title}`}
								</Text>
								<Text numberOfLines={1} style={styles.itemSubtitle}>
									{item.id}
								</Text>
							</View>
						))}
					</View>
				) : null}

				{feedback ? (
					<View style={styles.feedbackBox}>
						<Text style={[styles.feedbackText, { color: colors.primary }]}>
							{feedback}
						</Text>
					</View>
				) : null}
			</View>
		</View>
	);
}

function createStyles(colors: MobileColors, metrics: MobileMetrics) {
	return StyleSheet.create({
		actionsRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: metrics.size(8),
		},
		card: {
			backgroundColor: colors.graySoft,
			borderRadius: 8,
			gap: metrics.size(10),
			padding: metrics.size(14),
		},
		detail: {
			color: colors.textMuted,
			fontSize: metrics.size(12),
		},
		divider: {
			backgroundColor: colors.border,
			height: StyleSheet.hairlineWidth,
			marginVertical: metrics.size(4),
		},
		feedbackBox: {
			backgroundColor: colors.card,
			borderRadius: 6,
			marginTop: metrics.size(4),
			padding: metrics.size(8),
		},
		feedbackText: {
			fontSize: metrics.size(12),
			fontWeight: "500",
		},
		heading: {
			color: colors.text,
			fontSize: metrics.size(16),
			fontWeight: "600",
		},
		listContainer: {
			backgroundColor: colors.card,
			borderRadius: 6,
			gap: metrics.size(6),
			marginTop: metrics.size(4),
			padding: metrics.size(8),
		},
		listItem: {
			gap: metrics.size(2),
		},
		itemSubtitle: {
			color: colors.textMuted,
			fontSize: metrics.size(10),
		},
		itemTitle: {
			color: colors.text,
			fontSize: metrics.size(12),
			fontWeight: "500",
		},
		row: {
			alignItems: "center",
			flexDirection: "row",
			justifyContent: "space-between",
		},
		section: {
			gap: metrics.size(12),
			paddingTop: metrics.size(12),
		},
		title: {
			color: colors.text,
			fontSize: metrics.size(13),
			fontWeight: "600",
		},
	});
}
