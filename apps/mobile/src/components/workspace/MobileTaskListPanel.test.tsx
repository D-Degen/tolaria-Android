// @vitest-environment jsdom
import {
	act,
	type ChangeEvent,
	createElement,
	type KeyboardEvent,
	type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("phosphor-react-native", () => ({
	CalendarBlank: () => null,
	CheckSquare: () => null,
	MagnifyingGlass: () => null,
	Square: () => null,
}));

vi.mock("../ui/text", () => ({
	Text: ({ children }: { children?: ReactNode }) =>
		createElement("span", null, children),
}));

vi.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

vi.mock("../../ui/MobileIconButton", () => ({
	MobileIconButton: ({
		children,
		testID,
		onPress,
	}: {
		children?: ReactNode;
		testID?: string;
		onPress?: () => void;
	}) =>
		createElement(
			"button",
			{ type: "button", "data-testid": testID, onClick: onPress },
			children,
		),
}));

vi.mock("../../ui/MobilePanel", () => ({
	MobilePanel: ({
		children,
		testID,
	}: {
		children?: ReactNode;
		testID?: string;
	}) => createElement("div", { "data-testid": testID }, children),
	MobileToolbar: ({
		children,
		testID,
	}: {
		children?: ReactNode;
		testID?: string;
	}) => createElement("div", { "data-testid": testID }, children),
	MobileToolbarSpacer: () => null,
	MobileToolbarTitle: ({
		title,
		testID,
	}: {
		title?: string;
		testID?: string;
	}) => createElement("span", { "data-testid": testID }, title),
}));

vi.mock("../../ui/theme/useMobileTheme", () => ({
	useMobileColors: () => ({
		border: "#eee",
		danger: "#ef4444",
		primary: "#6366f1",
		primarySoft: "#e0e7ff",
		text: "#111",
		textInverse: "#fff",
		textMuted: "#888",
	}),
}));

vi.mock("react-native-reanimated", () => ({
	default: {
		View: ({
			children,
			style,
			testID,
		}: {
			children?: ReactNode;
			style?: unknown;
			testID?: string;
		}) =>
			createElement(
				"div",
				{ "data-testid": testID, style: style as Record<string, unknown> },
				children,
			),
	},
	useAnimatedStyle: (fn: () => unknown) => fn(),
	useReducedMotion: () => false,
	useSharedValue: (init: unknown) => {
		let val = init;
		return {
			get: () => val,
			set: (updater: unknown) => {
				val =
					typeof updater === "function"
						? (updater as (prev: unknown) => unknown)(val)
						: updater;
			},
			get value() {
				return val;
			},
			set value(next) {
				val = next;
			},
		};
	},
	withSpring: (toValue: unknown) => toValue,
	withTiming: (toValue: unknown) => toValue,
}));

vi.mock("react-native", () => ({
	Pressable: ({
		children,
		testID,
		onPress,
		accessibilityLabel,
		accessibilityState,
	}: {
		children?: ReactNode;
		testID?: string;
		onPress?: () => void;
		accessibilityLabel?: string;
		accessibilityState?: { checked?: boolean };
	}) =>
		createElement(
			"button",
			{
				type: "button",
				"data-testid": testID,
				"aria-checked": accessibilityState?.checked,
				"aria-label": accessibilityLabel,
				onClick: onPress,
			},
			children,
		),
	ScrollView: ({
		children,
		testID,
	}: {
		children?: ReactNode;
		testID?: string;
	}) => createElement("div", { "data-testid": testID }, children),
	StyleSheet: { create: (styles: object) => styles, hairlineWidth: 1 },
	TextInput: ({
		testID,
		value,
		onChangeText,
		onSubmitEditing,
	}: {
		testID?: string;
		value?: string;
		onChangeText?: (text: string) => void;
		onSubmitEditing?: () => void;
	}) =>
		createElement("input", {
			"data-testid": testID,
			value,
			onChange: (e: ChangeEvent<HTMLInputElement>) =>
				onChangeText?.(e.target.value),
			onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
				if (e.key === "Enter") onSubmitEditing?.();
			},
		}),
	View: ({ children, testID }: { children?: ReactNode; testID?: string }) =>
		createElement("div", { "data-testid": testID }, children),
}));

import type { MobileNote } from "../../workspace/mobileWorkspaceModel";
import { MobileTaskListPanel } from "./MobileTaskListPanel";

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

function sampleNote(overrides: Partial<MobileNote> = {}): MobileNote {
	return {
		created: "2026-10-31",
		date: "2026-10-31",
		favorite: false,
		id: "note-1",
		links: 0,
		modified: "2026-10-31",
		relationships: [],
		snippet: "",
		status: "open",
		tags: [],
		title: "Sprint Planung",
		type: "Note",
		typeTone: "blue",
		workspace: "default",
		...overrides,
	};
}

describe("MobileTaskListPanel", () => {
	it("displays both Task notes and checkboxes from non-Task notes, and handles toggling and quick due-date edits", async () => {
		const onApplyEdit = vi.fn();
		const onSelectNote = vi.fn();

		const taskNote = sampleNote({
			id: "task-note-1",
			title: "Steuererklärung abgeben",
			type: "Task",
			properties: [{ key: "due", label: "Due", value: "2026-10-31" }],
		});
		const regularNoteWithCheckbox = sampleNote({
			id: "meeting-note-2",
			title: "Meeting Notizen",
			type: "Note",
			rawContent: "# Meeting\n- [ ] Protokoll versenden 📅 2026-11-01\n",
		});

		await act(async () => {
			root.render(
				createElement(MobileTaskListPanel, {
					notes: [taskNote, regularNoteWithCheckbox],
					taskCommitDelayMs: 0,
					today: "2026-10-31",
					onApplyEdit,
					onSelectNote,
				}),
			);
		});

		// Both entries should render
		const taskToggle = host.querySelector(
			'[data-testid="task-toggle-note:task-note-1"]',
		);
		const checkboxToggle = host.querySelector(
			'[data-testid="task-toggle-checkbox:meeting-note-2:1"]',
		);
		expect(taskToggle).not.toBeNull();
		expect(checkboxToggle).not.toBeNull();

		// Toggle the checkbox item
		await act(async () => {
			checkboxToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
		expect(onApplyEdit).toHaveBeenCalledWith({
			checked: true,
			expectedText: "Protokoll versenden",
			line: 1,
			noteId: "meeting-note-2",
			type: "updateChecklistItem",
		});

		// Open due date quick editor on the task note and set to tomorrow
		const taskDueBtn = host.querySelector(
			'[data-testid="task-due-note:task-note-1"]',
		);
		await act(async () => {
			taskDueBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});

		const tomorrowQuickChip = host.querySelector(
			'[data-testid="task-due-quick-tomorrow"]',
		);
		expect(tomorrowQuickChip).not.toBeNull();

		await act(async () => {
			tomorrowQuickChip?.dispatchEvent(
				new MouseEvent("click", { bubbles: true }),
			);
		});

		expect(onApplyEdit).toHaveBeenCalledWith({
			key: "due",
			noteId: "task-note-1",
			type: "updateProperty",
			value: "2026-11-01",
		});
	});

	it("delays committing task completion and stays in view before fading out", async () => {
		vi.useFakeTimers();
		const onApplyEdit = vi.fn();
		const onSelectNote = vi.fn();

		const taskNote = sampleNote({
			id: "task-1",
			title: "Einkaufen gehen",
			type: "Task",
		});

		await act(async () => {
			root.render(
				createElement(MobileTaskListPanel, {
					notes: [taskNote],
					taskCommitDelayMs: 650,
					today: "2026-10-31",
					onApplyEdit,
					onSelectNote,
				}),
			);
		});

		const toggleBtn = host.querySelector(
			'[data-testid="task-toggle-note:task-1"]',
		);
		expect(toggleBtn).not.toBeNull();

		// Click to check off
		await act(async () => {
			toggleBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});

		// Immediately shows checked state in UI, but edit is not committed yet
		expect(toggleBtn?.getAttribute("aria-label")).toBe("Als offen markieren");
		expect(onApplyEdit).not.toHaveBeenCalled();

		// Advance 650ms (hold duration): fade begins, still not committed
		await act(async () => {
			vi.advanceTimersByTime(650);
		});
		expect(onApplyEdit).not.toHaveBeenCalled();

		// Advance 350ms (fade-out duration): commit occurs
		await act(async () => {
			vi.advanceTimersByTime(350);
		});
		expect(onApplyEdit).toHaveBeenCalledWith({
			key: "status",
			noteId: "task-1",
			type: "updateProperty",
			value: "Done",
		});
		vi.useRealTimers();
	});

	it("cancels pending completion if tapped again before delay expires", async () => {
		vi.useFakeTimers();
		const onApplyEdit = vi.fn();
		const onSelectNote = vi.fn();

		const taskNote = sampleNote({
			id: "task-1",
			title: "Einkaufen gehen",
			type: "Task",
		});

		await act(async () => {
			root.render(
				createElement(MobileTaskListPanel, {
					notes: [taskNote],
					taskCommitDelayMs: 650,
					today: "2026-10-31",
					onApplyEdit,
					onSelectNote,
				}),
			);
		});

		const toggleBtn = host.querySelector(
			'[data-testid="task-toggle-note:task-1"]',
		);
		expect(toggleBtn).not.toBeNull();

		// First click: mark pending done
		await act(async () => {
			toggleBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
		expect(toggleBtn?.getAttribute("aria-label")).toBe("Als offen markieren");

		// Second click before delay finishes: cancel pending completion
		await act(async () => {
			toggleBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
		expect(toggleBtn?.getAttribute("aria-label")).toBe("Abhaken");

		// Advance past the timers
		await act(async () => {
			vi.advanceTimersByTime(1200);
		});
		expect(onApplyEdit).not.toHaveBeenCalled();
		vi.useRealTimers();
	});
});
