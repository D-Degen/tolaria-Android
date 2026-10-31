// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("phosphor-react-native", () => ({
	Bell: () => null,
	Check: () => null,
	Clock: () => null,
	Trash: () => null,
	Warning: () => null,
}));

vi.mock("../components/ui/text", () => ({
	Text: ({ children }: { children?: ReactNode }) =>
		createElement("span", null, children),
}));

vi.mock("../ui/MobileButton", () => ({
	MobileButton: ({ label, onPress }: { label: string; onPress?: () => void }) =>
		createElement("button", { type: "button", onClick: onPress }, label),
}));

vi.mock("../ui/theme/useMobileTheme", () => ({
	useMobileColors: () => ({
		border: "#eee",
		card: "#fff",
		danger: "#ef4444",
		graySoft: "#f3f4f6",
		primary: "#6366f1",
		text: "#111",
		textMuted: "#888",
	}),
	useMobileStyles: () => ({
		styles: {
			card: {},
			detail: {},
			divider: {},
			feedbackBox: {},
			feedbackText: {},
			heading: {},
			itemSubtitle: {},
			itemTitle: {},
			listContainer: {},
			listItem: {},
			row: {},
			section: {},
			title: {},
		},
	}),
}));

vi.mock("react-native", () => ({
	Platform: { OS: "android" },
	StyleSheet: { create: (s: object) => s, hairlineWidth: 1 },
	View: ({ children }: { children?: ReactNode }) =>
		createElement("div", null, children),
}));

const mockScheduleNotificationAsync = vi.fn().mockResolvedValue("test-id-123");
const mockGetPermissionsAsync = vi
	.fn()
	.mockResolvedValue({ granted: true, status: "granted" });
const mockRequestPermissionsAsync = vi
	.fn()
	.mockResolvedValue({ granted: true, status: "granted" });
const mockGetAllScheduledNotificationsAsync = vi
	.fn()
	.mockResolvedValue([
		{ identifier: "task-1", content: { title: "Aufgabe 1" } },
	]);
const mockCancelAllScheduledNotificationsAsync = vi
	.fn()
	.mockResolvedValue(undefined);
const mockSetNotificationChannelAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("expo-notifications", () => ({
	AndroidImportance: { HIGH: 4 },
	SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
	cancelAllScheduledNotificationsAsync:
		mockCancelAllScheduledNotificationsAsync,
	getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
	getPermissionsAsync: mockGetPermissionsAsync,
	requestPermissionsAsync: mockRequestPermissionsAsync,
	scheduleNotificationAsync: mockScheduleNotificationAsync,
	setNotificationChannelAsync: mockSetNotificationChannelAsync,
}));

import { MobileDeveloperSettings } from "./MobileDeveloperSettings";

let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.clearAllMocks();
	host = document.createElement("div");
	root = createRoot(host);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

describe("MobileDeveloperSettings", () => {
	it("renders and allows triggering test notifications and querying alarms", async () => {
		await act(async () => {
			root.render(createElement(MobileDeveloperSettings));
		});

		expect(host.textContent).toContain("Entwickler & Benachrichtigungs-Tests");
		expect(host.textContent).toContain("Noch nicht geprüft");

		const buttons = Array.from(host.querySelectorAll("button"));
		const permBtn = buttons.find((btn) =>
			btn.textContent?.includes("Berechtigung prüfen"),
		);
		expect(permBtn).toBeDefined();

		await act(async () => {
			permBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
		expect(host.textContent).toContain("Erteilt ✅");
		const trigger2sBtn = buttons.find((btn) =>
			btn.textContent?.includes("In 2s"),
		);
		expect(trigger2sBtn).toBeDefined();

		await act(async () => {
			trigger2sBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});

		expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.objectContaining({
					title: "Tolaria Test-Erinnerung (2s)",
				}),
			}),
		);

		const queryBtn = buttons.find((btn) =>
			btn.textContent?.includes("Alarme abfragen"),
		);
		expect(queryBtn).toBeDefined();

		await act(async () => {
			queryBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});

		expect(mockGetAllScheduledNotificationsAsync).toHaveBeenCalled();
		expect(host.textContent).toContain("1 aktiv");
	});
});
