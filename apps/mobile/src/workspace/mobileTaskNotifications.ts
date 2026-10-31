import { Platform } from "react-native";
import type { MobileTaskEntry } from "./mobileTasks";

async function getNotifications() {
	try {
		return await import("expo-notifications");
	} catch {
		return null;
	}
}

export async function setupMobileNotifications() {
	try {
		const Notifications = await getNotifications();
		if (!Notifications) return;

		Notifications.setNotificationHandler({
			handleNotification: async () => ({
				shouldPlaySound: true,
				shouldSetBadge: false,
				shouldShowAlert: true,
				shouldShowBanner: true,
				shouldShowList: true,
			}),
		});

		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync("tasks", {
				enableVibrate: true,
				importance: Notifications.AndroidImportance.HIGH,
				name: "Aufgaben-Erinnerungen",
				sound: "default",
				vibrationPattern: [0, 250, 250, 250],
			});
		}
	} catch {
		// Ignore in unsupported environments
	}
}

// Initialize notification handler immediately on module load
void setupMobileNotifications();

export async function ensureNotificationPermissions(): Promise<boolean> {
	try {
		const Notifications = await getNotifications();
		if (!Notifications) return false;

		const existing = await Notifications.getPermissionsAsync();
		if (existing.granted) return true;

		const requested = await Notifications.requestPermissionsAsync();
		return requested.granted;
	} catch {
		return false;
	}
}

export const TASK_TIME_PATTERN =
	/(?:⏰|\bum\s*|\bat\s*|\btime:)\s*([01]?\d|2[0-3]):([0-5]\d)/u;

export function parseTaskTime(text: string): string | null {
	const match = TASK_TIME_PATTERN.exec(text);
	if (!match) return null;
	const hours = match[1].padStart(2, "0");
	const minutes = match[2];
	return `${hours}:${minutes}`;
}

export function calculateTaskNotificationTimestamp(
	due: string,
	defaultTime: string,
	taskTime?: string | null,
): number | null {
	const time =
		taskTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(taskTime)
			? taskTime
			: defaultTime;
	const timeMatch = /^([01]\d|2[0-3]):[0-5]\d$/.exec(time);
	const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
	if (!timeMatch || !dateMatch) return null;

	const [, year, month, day] = dateMatch.map(Number);
	const [hours, minutes] = time.split(":").map(Number);
	const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
	return date.getTime();
}

export type TaskNotificationPayload = {
	body: string;
	identifier: string;
	title: string;
	triggerTimestamp: number;
};

export function buildTaskNotificationPayload(
	entry: MobileTaskEntry,
	defaultTime: string,
): TaskNotificationPayload | null {
	if (entry.done || !entry.due) return null;
	const taskTime = parseTaskTime(entry.title);
	const triggerTimestamp = calculateTaskNotificationTimestamp(
		entry.due,
		defaultTime,
		taskTime,
	);
	if (!triggerTimestamp) return null;

	const cleanTitle = entry.title.replace(TASK_TIME_PATTERN, "").trim();
	return {
		body: entry.subtitle
			? `In Notiz: ${entry.subtitle}`
			: "Fällige Aufgabe in Tolaria",
		identifier: `tolaria:task:${entry.id}`,
		title: cleanTitle || entry.title,
		triggerTimestamp,
	};
}

export type NotificationScheduler = {
	cancel: (identifier: string) => Promise<void>;
	cancelAll: () => Promise<void>;
	schedule: (payload: TaskNotificationPayload) => Promise<void>;
};

export const defaultNotificationScheduler: NotificationScheduler = {
	cancel: async (identifier: string) => {
		try {
			const Notifications = await getNotifications();
			await Notifications?.cancelScheduledNotificationAsync(identifier);
		} catch {
			// Ignore if not supported in environment
		}
	},
	cancelAll: async () => {
		try {
			const Notifications = await getNotifications();
			await Notifications?.cancelAllScheduledNotificationsAsync();
		} catch {
			// Ignore
		}
	},
	schedule: async (payload: TaskNotificationPayload) => {
		try {
			const Notifications = await getNotifications();
			if (!Notifications) return;
			await setupMobileNotifications();
			await Notifications.scheduleNotificationAsync({
				content: {
					body: payload.body,
					sound: "default",
					title: payload.title,
				},
				identifier: payload.identifier,
				trigger: {
					channelId: "tasks",
					date: new Date(payload.triggerTimestamp),
					type: Notifications.SchedulableTriggerInputTypes.DATE,
				} as unknown as Parameters<
					typeof Notifications.scheduleNotificationAsync
				>[0]["trigger"],
			});
		} catch {
			// Ignore if permission not granted or in tests
		}
	},
};

export async function syncTaskNotifications(
	entries: MobileTaskEntry[],
	options: {
		defaultTime: string;
		enabled: boolean;
		now?: number;
		scheduler?: NotificationScheduler;
	},
): Promise<{ scheduled: string[]; cancelled: string[] }> {
	const scheduler = options.scheduler ?? defaultNotificationScheduler;
	const now = options.now ?? Date.now();
	const scheduled: string[] = [];
	const cancelled: string[] = [];

	if (!options.enabled) {
		for (const entry of entries) {
			const id = `tolaria:task:${entry.id}`;
			await scheduler.cancel(id);
			cancelled.push(id);
		}
		return { cancelled, scheduled };
	}

	// Request permissions if not yet granted
	void ensureNotificationPermissions();

	for (const entry of entries) {
		const id = `tolaria:task:${entry.id}`;
		if (entry.done || !entry.due) {
			await scheduler.cancel(id);
			cancelled.push(id);
			continue;
		}

		const payload = buildTaskNotificationPayload(entry, options.defaultTime);
		if (!payload || payload.triggerTimestamp <= now) {
			// Overdue or past trigger time, cancel any stale future notification
			await scheduler.cancel(id);
			cancelled.push(id);
			continue;
		}

		await scheduler.schedule(payload);
		scheduled.push(payload.identifier);
	}

	return { cancelled, scheduled };
}
