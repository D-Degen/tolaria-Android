import { useEffect, useRef } from "react";
import { expoWorkspaceFileSystem } from "../workspace/expoWorkspaceFileSystem";
import { type MobileSettings, parseMobileSettings } from "./mobileSettings";

export const VAULT_MOBILE_SETTINGS_PATH = ".tolaria/mobile.json";

export function useMobileVaultSettingsSync(
	vaultRootUri: string | undefined,
	ready: boolean,
	settings: MobileSettings,
	update: (next: Partial<MobileSettings>) => Promise<boolean | undefined>,
	fileSystem = expoWorkspaceFileSystem,
) {
	const lastSyncContentRef = useRef<string | null>(null);
	const isSyncingFromVaultRef = useRef(false);

	// 1. When vaultRootUri changes or mounts: load from vault if present, or write initial config
	useEffect(() => {
		if (!vaultRootUri || !ready) return;
		let active = true;

		const loadOrInit = async () => {
			try {
				const content = fileSystem.readTextFileAsync
					? await fileSystem.readTextFileAsync(
							vaultRootUri,
							VAULT_MOBILE_SETTINGS_PATH,
						)
					: fileSystem.readTextFile(vaultRootUri, VAULT_MOBILE_SETTINGS_PATH);
				if (!active) return;

				if (content) {
					const parsed = parseMobileSettings(content);
					lastSyncContentRef.current = JSON.stringify(parsed);
					isSyncingFromVaultRef.current = true;
					await update(parsed);
					isSyncingFromVaultRef.current = false;
				} else {
					// Initialize .tolaria/mobile.json in vault with current preferences
					const initialContent = JSON.stringify(settings, null, 2);
					fileSystem.writeTextFile(
						vaultRootUri,
						VAULT_MOBILE_SETTINGS_PATH,
						initialContent,
					);
					lastSyncContentRef.current = JSON.stringify(settings);
				}
			} catch {
				isSyncingFromVaultRef.current = false;
			}
		};

		void loadOrInit();

		return () => {
			active = false;
		};
	}, [vaultRootUri, ready, update, settings, fileSystem]);

	// 2. When settings change: write to .tolaria/mobile.json
	useEffect(() => {
		if (!vaultRootUri || !ready || isSyncingFromVaultRef.current) return;
		const currentJson = JSON.stringify(settings);
		if (currentJson === lastSyncContentRef.current) return;

		try {
			fileSystem.writeTextFile(
				vaultRootUri,
				VAULT_MOBILE_SETTINGS_PATH,
				JSON.stringify(settings, null, 2),
			);
			lastSyncContentRef.current = currentJson;
		} catch {
			// Ignore
		}
	}, [vaultRootUri, ready, settings, fileSystem]);
}
