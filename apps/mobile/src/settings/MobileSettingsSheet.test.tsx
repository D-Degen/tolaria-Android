// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileSettingsSheet } from "./MobileSettingsSheet";

vi.mock("phosphor-react-native", () => ({
	Alarm: () => null,
	ArrowClockwise: () => null,
	ArrowLeft: () => null,
	Bell: () => null,
	Check: () => null,
	Clock: () => null,
	Copy: () => null,
	DeviceMobile: () => null,
	GitBranch: () => null,
	Moon: () => null,
	NotePencil: () => null,
	Palette: () => null,
	ShieldCheck: () => null,
	Sun: () => null,
	Trash: () => null,
	Warning: () => null,
	Wrench: () => null,
	X: () => null,
}));

vi.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

vi.mock("react-native", () => ({
	Modal: ({ children, visible }: { children?: ReactNode; visible?: boolean }) =>
		visible ? createElement("div", { "data-testid": "mock-modal" }, children) : null,
	View: ({ children, testID }: { children?: ReactNode; testID?: string }) =>
		createElement("div", { "data-testid": testID }, children),
	Pressable: ({
		children,
		testID,
		onPress,
		accessibilityLabel,
	}: {
		children?: ReactNode;
		testID?: string;
		onPress?: () => void;
		accessibilityLabel?: string;
	}) =>
		createElement(
			"button",
			{ type: "button", "data-testid": testID, "aria-label": accessibilityLabel, onClick: onPress },
			children,
		),
	ScrollView: ({ children, testID }: { children?: ReactNode; testID?: string }) =>
		createElement("div", { "data-testid": testID }, children),
	TextInput: ({
		value,
		testID,
		placeholder,
		onChangeText,
	}: {
		value?: string;
		testID?: string;
		placeholder?: string;
		onChangeText?: (text: string) => void;
	}) =>
		createElement("input", {
			"data-testid": testID,
			defaultValue: value,
			placeholder,
			onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
		}),
	StyleSheet: { create: (styles: object) => styles, hairlineWidth: 1 },
	Platform: { OS: "android" },
}));

vi.mock("../components/ui/text", () => ({
	Text: ({ children }: { children?: ReactNode }) => createElement("span", null, children),
}));

vi.mock("../components/ui/switch", () => ({
	Switch: () => createElement("input", { type: "checkbox" }),
}));

vi.mock("../ui/MobileButton", () => ({
	MobileButton: ({ label, onPress, testID }: { label: string; onPress?: () => void; testID?: string }) =>
		createElement("button", { type: "button", "data-testid": testID, onClick: onPress }, label),
}));

vi.mock("../components/vaults/MobileVaultManager", () => ({
	MobileVaultManager: () => createElement("div", { "data-testid": "vault-manager" }),
}));

vi.mock("../analytics/useMobileAnalytics", () => ({
	useMobileAnalytics: () => ({ capture: vi.fn(), setEnabled: vi.fn() }),
}));

vi.mock("../analytics/mobileSentry", () => ({
	mobileCrashReporting: { setEnabled: vi.fn() },
}));

vi.mock("./useMobileUpdateChannel", () => ({
	useMobileUpdateChannel: () => ({
		disabled: false,
		phase: "idle",
		selected: "stable",
		runtime: {},
		check: vi.fn(),
		restart: vi.fn(),
		select: vi.fn(),
	}),
}));

const mockUpdate = vi.fn().mockResolvedValue(true);
let mockOpened = true;

vi.mock("./useMobileSettings", () => ({
	useMobileSettings: () => ({
		opened: mockOpened,
		ready: true,
		saving: false,
		error: null,
		close: vi.fn(() => {
			mockOpened = false;
		}),
		open: vi.fn(() => {
			mockOpened = true;
		}),
		retry: vi.fn(),
		settings: {
			autoGit: false,
			analytics: false,
			crashReporting: false,
			defaultEditingMode: "wysiwyg",
			editorFontSize: "normal",
			taskNotificationsEnabled: true,
			taskNotificationTime: "09:00",
			theme: "system",
			uiScale: 1.2,
			updateChannel: "stable",
		},
		update: mockUpdate,
	}),
}));

vi.mock("../workspace/useMobileModalDismiss", () => ({
	useMobileModalDismiss: () => {},
}));

vi.mock("../i18n/mobileText", () => ({
	mobileText: (key: string) => key,
}));

const mockColors = {
	app: "#111",
	border: "#333",
	card: "#222",
	danger: "#ef4444",
	graySoft: "#333",
	primary: "#6366f1",
	primarySoft: "rgba(99, 102, 241, 0.15)",
	text: "#fff",
	textMuted: "#888",
};
const mockMetrics = {
	size: (n: number) => n,
};

vi.mock("../ui/theme/useMobileTheme", () => ({
	useMobileColors: () => mockColors,
	useMobileMetrics: () => mockMetrics,
	useMobileTheme: () => ({ mode: "light", colors: mockColors, metrics: mockMetrics }),
	useMobileStyles: <T,>(fn?: (colors: typeof mockColors, metrics: typeof mockMetrics) => T) => {
		if (typeof fn === "function") {
			return fn(mockColors, mockMetrics);
		}
		return {} as unknown as T;
	},
}));

describe("MobileSettingsSheet", () => {
	let host: HTMLDivElement;
	let root: ReturnType<typeof createRoot> | null = null;

	const dummyManager = {
		account: {} as unknown,
		busy: false,
		catalog: {} as unknown,
		clone: vi.fn(),
		cloneProgress: null,
		close: vi.fn(),
		conflictFailure: null,
		conflictReview: null,
		cancelConflictReview: vi.fn(),
		error: null,
		linked: false,
		notices: { current: null, dismiss: vi.fn(), show: vi.fn() },
		opened: false,
		reviewConflicts: vi.fn(),
		resolveConflicts: vi.fn(),
		status: "synced" as const,
		sync: vi.fn(),
	} as unknown as Parameters<typeof MobileSettingsSheet>[0]["manager"];

	beforeEach(() => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		mockOpened = true;
		host = document.createElement("div");
		root = createRoot(host);
	});

	afterEach(async () => {
		await act(async () => root?.unmount());
		vi.unstubAllGlobals();
	});

	it("renders as a native full-screen view with top app bar and back button", async () => {
		await act(async () => {
			root?.render(createElement(MobileSettingsSheet, { manager: dummyManager }));
		});

		// Settings screen must be mounted with testID mobile-settings
		expect(host.querySelector('[data-testid="mobile-settings"]')).not.toBeNull();

		// Native top app bar back button must exist
		const backBtn = host.querySelector<HTMLButtonElement>(
			'[data-testid="settings-back-button"]',
		);
		expect(backBtn).not.toBeNull();

		// Clicking back button closes settings
		await act(async () => backBtn?.click());
		expect(dummyManager.close).toHaveBeenCalledOnce();
	});

	it("renders all setting category cards with modern grouped layout", async () => {
		await act(async () => {
			root?.render(createElement(MobileSettingsSheet, { manager: dummyManager }));
		});

		// 1. Vaults Card
		expect(host.querySelector('[data-testid="settings-vaults-card"]')).not.toBeNull();
		expect(host.querySelector('[data-testid="vault-manager"]')).not.toBeNull();

		// 2. Appearance Section with Theme Preview Cards
		expect(host.querySelector('[data-testid="settings-appearance-section"]')).not.toBeNull();
		expect(host.querySelector('[data-testid="settings-theme-light"]')).not.toBeNull();
		expect(host.querySelector('[data-testid="settings-theme-dark"]')).not.toBeNull();
		expect(host.querySelector('[data-testid="settings-theme-system"]')).not.toBeNull();

		// 3. Editor & Notizen Section
		expect(host.querySelector('[data-testid="settings-editor-section"]')).not.toBeNull();
		expect(host.querySelector('[data-testid="settings-font-size-compact"]')).not.toBeNull();
		expect(host.querySelector('[data-testid="settings-font-size-normal"]')).not.toBeNull();
		expect(host.querySelector('[data-testid="settings-font-size-large"]')).not.toBeNull();
		expect(host.querySelector('[data-testid="settings-default-mode-wysiwyg"]')).not.toBeNull();
		expect(host.querySelector('[data-testid="settings-default-mode-source"]')).not.toBeNull();

		// 4. Notifications Card
		expect(host.querySelector('[data-testid="settings-notifications-card"]')).not.toBeNull();

		// 5. Updates Card
		expect(host.querySelector('[data-testid="settings-updates-card"]')).not.toBeNull();

		// 6. Privacy Card
		expect(host.querySelector('[data-testid="settings-privacy-card"]')).not.toBeNull();

		// 7. Diagnostics & Developer Card
		expect(host.querySelector('[data-testid="settings-diagnostics-card"]')).not.toBeNull();
	});

	it("updates editor font size and default editing mode preferences on press", async () => {
		await act(async () => {
			root?.render(createElement(MobileSettingsSheet, { manager: dummyManager }));
		});

		const largeBtn = host.querySelector<HTMLButtonElement>(
			'[data-testid="settings-font-size-large"]',
		);
		await act(async () => largeBtn?.click());
		expect(mockUpdate).toHaveBeenCalledWith({ editorFontSize: "large" });

		const sourceBtn = host.querySelector<HTMLButtonElement>(
			'[data-testid="settings-default-mode-source"]',
		);
		await act(async () => sourceBtn?.click());
		expect(mockUpdate).toHaveBeenCalledWith({ defaultEditingMode: "source" });
	});
});
