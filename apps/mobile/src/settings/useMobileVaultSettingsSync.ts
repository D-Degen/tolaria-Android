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
	const lastLoadedVaultUriRef = useRef<string | null>(null);
	const lastWrittenJsonRef = useRef<string | null>(null);
	const isUpdatingFromVaultRef = useRef(false);

	// 1. Load from vault ONCE per vaultRootUri change
	useEffect(() => {
		if (!vaultRootUri || !ready) return;
		if (lastLoadedVaultUriRef.current === vaultRootUri) return;

		let active = true;

		const loadVaultSettings = async () => {
			try {
				lastLoadedVaultUriRef.current = vaultRootUri;
				const content = fileSystem.readTextFileAsync
					? await fileSystem.readTextFileAsync(
							vaultRootUri,
							VAULT_MOBILE_SETTINGS_PATH,
						)
					: fileSystem.readTextFile(vaultRootUri, VAULT_MOBILE_SETTINGS_PATH);

				if (!active) return;

				if (content) {
					const parsed = parseMobileSettings(content);
					const vaultJson = JSON.stringify(parsed);
					lastWrittenJsonRef.current = vaultJson;
					if (JSON.stringify(settings) !== vaultJson) {
						isUpdatingFromVaultRef.current = true;
						await update(parsed);
						isUpdatingFromVaultRef.current = false;
					}
				} else {
					// Initialize .tolaria/mobile.json in vault with current preferences
					const initialContent = JSON.stringify(settings, null, 2);
					fileSystem.writeTextFile(
						vaultRootUri,
						VAULT_MOBILE_SETTINGS_PATH,
						initialContent,
					);
					lastWrittenJsonRef.current = JSON.stringify(settings);
				}
			} catch {
				isUpdatingFromVaultRef.current = false;
			}
		};

		void loadVaultSettings();

		return () => {
			active = false;
		};
	}, [vaultRootUri, ready, fileSystem, settings, update]);

	// 2. When settings change: write to .tolaria/mobile.json
	useEffect(() => {
		if (!vaultRootUri || !ready || isUpdatingFromVaultRef.current) return;
		const currentJson = JSON.stringify(settings);
		if (currentJson === lastWrittenJsonRef.current) return;

		try {
			fileSystem.writeTextFile(
				vaultRootUri,
				VAULT_MOBILE_SETTINGS_PATH,
				JSON.stringify(settings, null, 2),
			);
			lastWrittenJsonRef.current = currentJson;
		} catch {
			// Ignore
		}
	}, [vaultRootUri, ready, settings, fileSystem]);
}
