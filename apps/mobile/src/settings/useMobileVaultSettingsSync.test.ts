// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceFileSystem } from "../workspace/fileSystemWorkspaceRepository";
import { defaultMobileSettings, type MobileSettings } from "./mobileSettings";
import {
	useMobileVaultSettingsSync,
	VAULT_MOBILE_SETTINGS_PATH,
} from "./useMobileVaultSettingsSync";

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

function TestHarness({
	vaultRootUri,
	preferences,
	fileSystem,
}: {
	vaultRootUri: string | undefined;
	preferences: {
		ready: boolean;
		settings: MobileSettings;
		update: (next: Partial<MobileSettings>) => Promise<boolean | undefined>;
	};
	fileSystem: WorkspaceFileSystem;
}) {
	useMobileVaultSettingsSync(
		vaultRootUri,
		preferences.ready,
		preferences.settings,
		preferences.update,
		fileSystem,
	);
	return createElement("div", null, "synced");
}

describe("useMobileVaultSettingsSync", () => {
	it("initializes .tolaria/mobile.json when file does not exist in vault", async () => {
		const readTextFileAsync = vi.fn().mockResolvedValue(null);
		const writeTextFile = vi.fn();
		const update = vi.fn().mockResolvedValue(undefined);

		const preferences = {
			ready: true,
			settings: { ...defaultMobileSettings, taskNotificationTime: "10:30" },
			update,
		};

		const fileSystem = {
			readTextFileAsync,
			writeTextFile,
		} as unknown as WorkspaceFileSystem;

		await act(async () => {
			root.render(
				createElement(TestHarness, {
					fileSystem,
					preferences,
					vaultRootUri: "file:///test-vault",
				}),
			);
		});

		expect(readTextFileAsync).toHaveBeenCalledWith(
			"file:///test-vault",
			VAULT_MOBILE_SETTINGS_PATH,
		);
		expect(writeTextFile).toHaveBeenCalledWith(
			"file:///test-vault",
			VAULT_MOBILE_SETTINGS_PATH,
			expect.stringContaining('"taskNotificationTime": "10:30"'),
		);
	});

	it("loads and applies settings from vault when .tolaria/mobile.json exists", async () => {
		const vaultSettings = {
			...defaultMobileSettings,
			taskNotificationTime: "08:15",
			taskNotificationsEnabled: false,
		};
		const readTextFileAsync = vi
			.fn()
			.mockResolvedValue(JSON.stringify(vaultSettings));
		const writeTextFile = vi.fn();
		const update = vi.fn().mockResolvedValue(undefined);

		const preferences = {
			ready: true,
			settings: defaultMobileSettings,
			update,
		};

		const fileSystem = {
			readTextFileAsync,
			writeTextFile,
		} as unknown as WorkspaceFileSystem;

		await act(async () => {
			root.render(
				createElement(TestHarness, {
					fileSystem,
					preferences,
					vaultRootUri: "file:///test-vault",
				}),
			);
		});

		expect(readTextFileAsync).toHaveBeenCalledWith(
			"file:///test-vault",
			VAULT_MOBILE_SETTINGS_PATH,
		);
		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				taskNotificationTime: "08:15",
				taskNotificationsEnabled: false,
			}),
		);
	});
});
