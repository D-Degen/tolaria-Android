import { type ReactNode, useEffect, useMemo } from "react";
import { MobileVaultNotice } from "../components/vaults/MobileVaultNotice";
import { MobileWorkspaceLoadFailure } from "../components/vaults/MobileWorkspaceLoadFailure";
import { MobileWorkspaceStartup } from "../components/workspace/MobileWorkspaceStartup";
import { MobileSettingsSheet } from "../settings/MobileSettingsSheet";
import { useMobileSettings } from "../settings/useMobileSettings";
import { useMobileVaultSettingsSync } from "../settings/useMobileVaultSettingsSync";
import { useMobileVaults } from "./git/useMobileVaults";
import {
	MobileVaultControlsContext,
	MobileVaultPickerContext,
} from "./MobileVaultContext";
import {
	initialWorkspacePending,
	vaultControls,
	workspaceRecovery,
} from "./mobileVaultPresentation";
import { NativeWorkspaceContext } from "./NativeWorkspaceContext";
import { WorkspaceLoadBoundary } from "./WorkspaceLoadBoundary";
import {
	WorkspaceSnapshotRevisionContext,
	WorkspaceSyncEditorsContext,
} from "./workspaceSyncEditors";

export function MobileVaultProvider({ children }: { children: ReactNode }) {
	const manager = useMobileVaults();
	const preferences = useMobileSettings();
	const { active, open, restorePending, revision, editors } = manager;
	const recovery = workspaceRecovery(manager);
	useCachedFailureNotice(manager);
	useMobileVaultSettingsSync(
		active.selection?.vaultRootUri,
		preferences.ready,
		preferences.settings,
		preferences.update,
	);
	const blockingRestore = initialWorkspacePending(manager);
	// Sync progress must not make the workspace re-index a large vault.
	const workspace = useMemo(
		() => ({
			selection: active.selection,
			open,
			restorePending: blockingRestore,
		}),
		[active.selection, open, blockingRestore],
	);
	const pending = manager.syncHistory.record.pendingPaths;
	const pendingNotePaths = useMemo(
		() => new Set((pending ?? []).map((change) => change.path)),
		[pending],
	);
	const controls = vaultControls(manager, pendingNotePaths);
	const picker = vaultPicker(manager, preferences.open);
	return (
		<MobileVaultPickerContext.Provider value={picker}>
			<WorkspaceSyncEditorsContext.Provider value={editors}>
				<NativeWorkspaceContext.Provider value={workspace}>
					<MobileVaultControlsContext.Provider value={controls}>
						<WorkspaceLoadBoundary
							resetKey={revision}
							fallback={<MobileWorkspaceLoadFailure onManage={open} />}
						>
							<WorkspaceSnapshotRevisionContext.Provider value={revision}>
								{recovery?.reason ? (
									<MobileWorkspaceLoadFailure
										onManage={open}
										onRetry={recovery.retry}
										reason={recovery.reason}
									/>
								) : (
									<MobileWorkspaceStartup
										preview={manager.catalog.preview}
										pending={restorePending}
										hasActiveWorkspace={Boolean(active.selection)}
										onSelectNote={manager.catalog.selectPreviewNote}
									>
										{children}
									</MobileWorkspaceStartup>
								)}
							</WorkspaceSnapshotRevisionContext.Provider>
						</WorkspaceLoadBoundary>
						<MobileSettingsSheet manager={manager} />
						{!manager.opened && manager.notices.current && (
							<MobileVaultNotice
								notice={manager.notices.current}
								dismiss={manager.notices.dismiss}
								onManage={open}
							/>
						)}
					</MobileVaultControlsContext.Provider>
				</NativeWorkspaceContext.Provider>
			</WorkspaceSyncEditorsContext.Provider>
		</MobileVaultPickerContext.Provider>
	);
}

function useCachedFailureNotice(manager: ReturnType<typeof useMobileVaults>) {
	const show = manager.notices.show;
	const failed = Boolean(manager.catalog.error && manager.catalog.preview);
	useEffect(() => {
		if (failed) show("local");
	}, [failed, show]);
}

function vaultPicker(
	manager: ReturnType<typeof useMobileVaults>,
	manage: () => void,
) {
	const { active, restorePending } = manager;
	return {
		disabled: manager.busy || restorePending,
		manage,
		choices: [
			...manager.catalog.localVaults.map((vault) => ({
				id: vault.id,
				label: vault.label,
				selected: active.selection?.vaultAlias === vault.id,
				select: () => manager.selectLocal(vault, false),
			})),
			...manager.catalog.vaults.map((vault) => ({
				id: vault.id,
				label: vault.label,
				selected: active.git?.id === vault.id,
				select: () => manager.select(vault, false),
			})),
		],
	};
}
