import {
	type ComponentProps,
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Dimensions, Platform, useWindowDimensions, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { MobileCommandPalette } from "../components/workspace/MobileCommandPalette";
import { MobileWorkspaceEditNotice } from "../components/workspace/MobileWorkspaceEditNotice";
import { logNativeMobileCommandPaletteProof } from "../qa/nativeMobileCommandPaletteProbe";
import {
	logNativeMobileKeyboardShortcutActionProof,
	logNativeMobileKeyboardShortcutBridgeProof,
} from "../qa/nativeMobileKeyboardShortcutProof";
import { useMobileStyles } from "../ui/theme/useMobileTheme";
import { buildMobileCommandPaletteCommands } from "../workspace/mobileCommandPalette";
import {
	type MobileEditorCommands,
	useMobileEditorCommandRegistry,
	useMobileEditorOverlayFocus,
} from "../workspace/mobileEditorCommands";
import {
	type MobileTableOfContentsTarget,
	mobileTableOfContentsHeadingTargetId,
} from "../workspace/mobileTableOfContents";
import { mobileNoteIdForWikilinkTarget } from "../workspace/mobileWikilinks";
import { useMobileWorkspaceKeyboardShortcuts } from "../workspace/mobileWorkspaceKeyboardShortcuts";
import type {
	MobileNote,
	MobileWorkspaceSnapshot,
} from "../workspace/mobileWorkspaceModel";
import {
	fixtureReadOnlyWorkspaceRepository,
	type ReadOnlyWorkspaceRepository,
	type ReadOnlyWorkspaceRequest,
} from "../workspace/readOnlyWorkspaceRepository";
import { WorkspaceActionSheetHost } from "./TabletWorkspaceActionSheetHost";
import {
	TabletEditorPanelHost,
	TabletLeftChromeHost,
	type TabletPanelGestures,
	TabletPropertiesPanelHost,
	type TabletTableOfContentsTargetRequest,
} from "./TabletWorkspacePanels";
import { createTabletWorkspaceStyles as createThemeStyles } from "./TabletWorkspaceStyles";
import { tabletScreenModeForWindow } from "./tabletWorkspaceScreenMode";
import type {
	MobileActionSheetQaTarget,
	TabletTransitionProbeMode,
	TabletWorkspaceChromeProps,
} from "./tabletWorkspaceTypes";
import { useInitialActionSheetQaTarget } from "./useInitialActionSheetQaTarget";
import { useTabletPanelGestures } from "./useTabletPanelGestures";
import { useTabletWorkspaceController } from "./useTabletWorkspaceController";

type TabletWorkspaceProps = {
	forceDesktopPanels?: boolean;
	initialCommandPaletteOpen?: boolean;
	initialEditorEditing?: boolean;
	initialEditorEditingMode?: TabletWorkspaceChromeProps["initialEditorEditingMode"];
	initialActionSheet?: MobileActionSheetQaTarget;
	commandPaletteProbe?: boolean;
	keyboardShortcutProbe?: boolean;
	layoutProbe?: boolean;
	onOpenNativeVault?: () => void;
	onTableOfContentsScrollProof?: TabletWorkspaceChromeProps["onTableOfContentsScrollProof"];
	repository?: ReadOnlyWorkspaceRepository;
	repositoryRequest?: ReadOnlyWorkspaceRequest;
	sourceIdleSave?: boolean;
	sourceSelectionProbe?: boolean;
	snapshot: MobileWorkspaceSnapshot;
	tableOfContentsProbe?: boolean;
	tabletTransitionProbe?: TabletTransitionProbeMode;
	wysiwygAutocompleteProbe?: boolean;
	wysiwygExternalLinkProbe?: boolean;
	wysiwygFormatCommandProbe?: boolean;
	wysiwygInputTransformProbe?: boolean;
	wysiwygMarkdownBlockProbe?: boolean;
	wysiwygMathEditProbe?: boolean;
	wysiwygTableCommandMutationProbe?: boolean;
	wysiwygWikilinkInsertProbe?: boolean;
	wysiwygMutationProbe?: boolean;
};

type TabletWorkspaceChromeViewProps = {
	workspace: TabletWorkspaceChromeProps;
	chrome: ReturnType<typeof useTabletChromeState>;
	styles: ReturnType<typeof createThemeStyles>["styles"];
};

type TabletEditorCommandRegistry = ReturnType<
	typeof useMobileEditorCommandRegistry
>;
type TabletCommandPaletteHostProps = ComponentProps<
	typeof MobileCommandPalette
> & { open: boolean };

export { WorkspaceActionSheetHost } from "./TabletWorkspaceActionSheetHost";

export function TabletWorkspace(props: TabletWorkspaceProps) {
	const {
		forceDesktopPanels = false,
		initialActionSheet,
		onOpenNativeVault,
		repository = fixtureReadOnlyWorkspaceRepository,
		repositoryRequest,
		snapshot,
	} = props;
	const { styles } = useMobileStyles(createThemeStyles);
	const controller = useTabletWorkspaceController({
		repository,
		repositoryRequest,
		snapshot,
	});

	useEffect(() => {
		const targetNoteId = snapshot.selectedNoteId;
		if (targetNoteId && targetNoteId !== controller.selectedNoteId) {
			controller.onSelectNote(targetNoteId);
		}
	}, [snapshot.selectedNoteId, controller]);
	const onCreateNote =
		controller.snapshot.sync.kind === "noVault" ||
		controller.snapshot.sync.kind === "readOnly"
			? (onOpenNativeVault ?? controller.onOpenCreateNote)
			: controller.onOpenCreateNote;
	const screenMode = useTabletScreenMode(forceDesktopPanels);
	useInitialActionSheetQaTarget(
		controller.onOpenActionSheetQaTarget,
		initialActionSheet,
	);

	return (
		<View style={styles.shellRoot}>
			<TabletWorkspaceChrome
				{...tabletWorkspacePresentationProps(props)}
				compactTablet={screenMode.compactTablet}
				defaultPropertiesVisible={screenMode.defaultPropertiesVisible}
				defaultSidebarVisible={screenMode.defaultSidebarVisible}
				exclusiveSidePanels={screenMode.exclusiveSidePanels}
				propertiesReplaceSidebar={screenMode.propertiesReplaceSidebar}
				onOpenNativeVault={onOpenNativeVault}
				{...controller}
				onOpenCreateNote={onCreateNote}
			/>
			<MobileWorkspaceEditNotice retry={controller.retryFailedEdit} />
		</View>
	);
}

function useTabletScreenMode(forceDesktopPanels: boolean) {
	const { height, width } = useWindowDimensions();
	const screen = Dimensions.get("screen");
	const nativeIpad = Platform.OS === "ios" && Platform.isPad;

	return tabletScreenModeForWindow({
		forceDesktopPanels,
		height,
		nativeIpad,
		screenHeight: screen.height,
		screenWidth: screen.width,
		width,
	});
}

function TabletWorkspaceChrome(props: TabletWorkspaceChromeProps) {
	const { styles } = useMobileStyles(createThemeStyles);
	const chrome = useTabletChromeState(props);
	return (
		<TabletWorkspaceChromeView
			workspace={props}
			chrome={chrome}
			styles={styles}
		/>
	);
}

function useTabletChromeState(props: TabletWorkspaceChromeProps) {
	const {
		commandPaletteProbe,
		compactTablet,
		defaultPropertiesVisible,
		defaultSidebarVisible = true,
		exclusiveSidePanels = false,
		propertiesReplaceSidebar = false,
		initialCommandPaletteOpen = false,
		onSelectNote,
		snapshot,
		tabletTransitionProbe = false,
	} = props;
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(
		initialCommandPaletteOpen,
	);
	const [tableOfContentsTarget, setTableOfContentsTarget] =
		useState<TabletTableOfContentsTargetRequest | null>(null);
	const editorCommandRegistry = useMobileEditorCommandRegistry();
	useMobileEditorOverlayFocus(
		Boolean(props.openAction) || commandPaletteOpen,
		editorCommandRegistry.commands,
	);
	const gestures = useTabletPanelGestures({
		compactTablet,
		defaultPropertiesVisible,
		defaultSidebarVisible,
		exclusiveSidePanels,
		propertiesReplaceSidebar,
	});
	const suggestionNotes = snapshot.allNotes ?? snapshot.notes;
	const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
	const closeCommandPalette = useCallback(
		() => setCommandPaletteOpen(false),
		[],
	);
	useTabletKeyboardShortcuts(props, gestures, editorCommandRegistry.commands, {
		open: openCommandPalette,
		visible: commandPaletteOpen,
	});
	const commandPaletteCommands = useTabletPaletteCommands(
		props,
		gestures,
		editorCommandRegistry,
		openCommandPalette,
	);
	useTabletTransitionProbe(tabletTransitionProbe, gestures);
	const handleNavigateWikilink = useTabletWikilinkNavigation(
		suggestionNotes,
		onSelectNote,
	);
	const handleSelectTableOfContentsTarget = useTabletOutlineSelection(
		setTableOfContentsTarget,
	);
	useTabletTableOfContentsProbe(
		props,
		tableOfContentsTarget,
		handleSelectTableOfContentsTarget,
	);
	useTabletChromeQaProofs(
		commandPaletteProbe,
		props.keyboardShortcutProbe,
		commandPaletteCommands,
	);
	return {
		gestures,
		suggestionNotes,
		editorCommandRegistry,
		tableOfContentsTarget,
		openCommandPalette,
		handleNavigateWikilink,
		handleSelectTableOfContentsTarget,
		commandPaletteCommands,
		commandPaletteOpen,
		closeCommandPalette,
	};
}

function useTabletWikilinkNavigation(
	suggestionNotes: MobileNote[],
	onSelectNote: TabletWorkspaceChromeProps["onSelectNote"],
) {
	return useCallback(
		(target: string) => {
			const noteId = mobileNoteIdForWikilinkTarget(suggestionNotes, target);
			if (noteId) onSelectNote(noteId);
		},
		[onSelectNote, suggestionNotes],
	);
}

function useTabletOutlineSelection(
	setTableOfContentsTarget: Dispatch<
		SetStateAction<TabletTableOfContentsTargetRequest | null>
	>,
) {
	return useCallback(
		(target: MobileTableOfContentsTarget) => {
			setTableOfContentsTarget((current) => ({
				...target,
				requestId: (current?.requestId ?? 0) + 1,
			}));
		},
		[setTableOfContentsTarget],
	);
}

function TabletWorkspaceChromeView(view: TabletWorkspaceChromeViewProps) {
	const { workspace: props, chrome, styles } = view;
	const { onSelectNote, snapshot } = props;
	const {
		gestures,
		suggestionNotes,
		editorCommandRegistry,
		tableOfContentsTarget,
		openCommandPalette,
		handleNavigateWikilink,
	} = chrome;
	return (
		<GestureDetector gesture={gestures.panGesture}>
			<View
				collapsable={false}
				style={styles.shell}
				testID="tablet-workspace-gesture-surface"
			>
				<TabletLeftChromeHost
					{...props}
					gestures={gestures}
					onOpenCommandPalette={openCommandPalette}
					onSelectNote={(noteId) => {
						editorCommandRegistry.commands.blur?.();
						onSelectNote(noteId);
					}}
				/>
				<TabletEditorPanelHost
					{...props}
					gestures={gestures}
					suggestionNotes={suggestionNotes}
					tableOfContentsTarget={tableOfContentsTarget}
					typeDefinitions={snapshot.typeDefinitions}
					onRegisterEditorCommands={editorCommandRegistry.register}
					onNavigateWikilink={handleNavigateWikilink}
				/>
				<TabletPropertiesPanelHost
					{...props}
					gestures={gestures}
					onFixInvalidFrontmatter={
						editorCommandRegistry.commands.toggleRawEditor
					}
				/>
				<TabletWorkspaceOverlayHost {...view} />
			</View>
		</GestureDetector>
	);
}

function TabletWorkspaceOverlayHost(view: TabletWorkspaceChromeViewProps) {
	const { workspace: props, chrome } = view;
	return (
		<>
			<WorkspaceActionSheetHost
				{...props}
				editorCommands={chrome.editorCommandRegistry.commands}
				suggestionNotes={chrome.suggestionNotes}
				onSelectTableOfContentsTarget={chrome.handleSelectTableOfContentsTarget}
			/>
			<TabletCommandPaletteHost
				commands={chrome.commandPaletteCommands}
				open={chrome.commandPaletteOpen}
				onClose={chrome.closeCommandPalette}
			/>
		</>
	);
}

function useTabletPaletteCommands(
	props: TabletWorkspaceChromeProps,
	gestures: TabletPanelGestures,
	editorCommandRegistry: TabletEditorCommandRegistry,
	openCommandPalette: () => void,
) {
	const { onOpenNativeVault } = props;
	return useMemo(
		() =>
			buildMobileCommandPaletteCommands({
				...props,
				onOpenCommandPalette: openCommandPalette,
				onOpenBacklinks: gestures.showProperties,
				onOpenNativeVault,
				onPastePlainText: editorCommandRegistry.commands.pastePlainText,
				onSaveActiveEditor: editorCommandRegistry.commands.save,
				onToggleRawEditor: editorCommandRegistry.commands.toggleRawEditor,
				onToggleProperties: gestures.toggleProperties,
				onViewAll: gestures.showAllPanels,
				onViewEditorList: gestures.showEditorList,
				onViewEditorOnly: gestures.showEditorOnly,
			}),
		[
			editorCommandRegistry.commands.pastePlainText,
			editorCommandRegistry.commands.save,
			editorCommandRegistry.commands.toggleRawEditor,
			gestures,
			onOpenNativeVault,
			openCommandPalette,
			props,
		],
	);
}

function useTabletTableOfContentsProbe(
	props: TabletWorkspaceChromeProps,
	tableOfContentsTarget: TabletTableOfContentsTargetRequest | null,
	handleSelectTableOfContentsTarget: (
		target: MobileTableOfContentsTarget,
	) => void,
) {
	useEffect(() => {
		if (!props.tableOfContentsProbe || tableOfContentsTarget) return;

		const timeout = setTimeout(() => {
			handleSelectTableOfContentsTarget({
				id: mobileTableOfContentsHeadingTargetId(0),
				level: 2,
				title: "Target Section",
			});
		}, 600);

		return () => clearTimeout(timeout);
	}, [
		handleSelectTableOfContentsTarget,
		props.tableOfContentsProbe,
		tableOfContentsTarget,
	]);
}

function useTabletChromeQaProofs(
	paletteProbe: boolean | undefined,
	keyboardProbe: boolean | undefined,
	commands: ComponentProps<typeof MobileCommandPalette>["commands"],
) {
	useEffect(() => {
		if (paletteProbe) logNativeMobileCommandPaletteProof(commands);
	}, [commands, paletteProbe]);
	useEffect(() => {
		if (keyboardProbe) logNativeMobileKeyboardShortcutBridgeProof();
	}, [keyboardProbe]);
}

function TabletCommandPaletteHost(props: TabletCommandPaletteHostProps) {
	const { commands, open, onClose } = props;
	if (!open) return null;
	return <MobileCommandPalette commands={commands} onClose={onClose} />;
}

function useTabletTransitionProbe(
	mode: TabletTransitionProbeMode,
	gestures: TabletPanelGestures,
) {
	const actionsRef = useRef({
		hideLeftChrome: gestures.hideLeftChrome,
		hideProperties: gestures.hideProperties,
		showLeftChrome: gestures.showLeftChrome,
		showProperties: gestures.showProperties,
	});

	useEffect(() => {
		actionsRef.current = {
			hideLeftChrome: gestures.hideLeftChrome,
			hideProperties: gestures.hideProperties,
			showLeftChrome: gestures.showLeftChrome,
			showProperties: gestures.showProperties,
		};
	}, [
		gestures.hideLeftChrome,
		gestures.hideProperties,
		gestures.showLeftChrome,
		gestures.showProperties,
	]);

	useEffect(() => {
		if (!mode) return;

		const timers = tabletTransitionProbeTimers(mode, () => actionsRef.current);

		return () => {
			timers.forEach(clearTimeout);
		};
	}, [mode]);
}

function tabletTransitionProbeTimers(
	mode: Exclude<TabletTransitionProbeMode, false>,
	currentActions: () => {
		hideLeftChrome: () => void;
		hideProperties: () => void;
		showLeftChrome: () => void;
		showProperties: () => void;
	},
) {
	if (mode === "properties") {
		return [
			setTimeout(() => currentActions().hideProperties(), 1400),
			setTimeout(() => currentActions().showProperties(), 3600),
			setTimeout(() => currentActions().hideProperties(), 5800),
			setTimeout(() => currentActions().showProperties(), 8000),
		];
	}

	return [
		setTimeout(() => currentActions().hideLeftChrome(), 1200),
		setTimeout(() => currentActions().showLeftChrome(), 2600),
		setTimeout(() => currentActions().hideProperties(), 4000),
		setTimeout(() => currentActions().showProperties(), 5400),
	];
}

function useTabletKeyboardShortcuts(
	props: TabletWorkspaceChromeProps,
	gestures: TabletPanelGestures,
	editor: MobileEditorCommands,
	palette: { open: () => void; visible: boolean },
) {
	const next = useCallback(
		() =>
			selectAdjacentVisibleNote(
				props.notes,
				props.selectedNoteId,
				props.onSelectNote,
				1,
			),
		[props.notes, props.onSelectNote, props.selectedNoteId],
	);
	const previous = useCallback(
		() =>
			selectAdjacentVisibleNote(
				props.notes,
				props.selectedNoteId,
				props.onSelectNote,
				-1,
			),
		[props.notes, props.onSelectNote, props.selectedNoteId],
	);
	useMobileWorkspaceKeyboardShortcuts({
		nativeNoteNavigationEnabled:
			gestures.noteListVisible && !props.openAction && !palette.visible,
		onCreateNote: props.onOpenCreateNote,
		onOpenFindInNote: props.onOpenFindInNote,
		onOpenCommandPalette: palette.open,
		onOpenSearch: props.onOpenSearch,
		onSelectNextNote: next,
		onSelectPreviousNote: previous,
		onShortcutAction: props.keyboardShortcutProbe
			? logNativeMobileKeyboardShortcutActionProof
			: undefined,
		onToggleRawEditor: editor.toggleRawEditor,
		onToggleProperties: gestures.toggleProperties,
		onViewAll: gestures.showAllPanels,
		onViewEditorList: gestures.showEditorList,
		onViewEditorOnly: gestures.showEditorOnly,
	});
}

function selectAdjacentVisibleNote(
	notes: MobileNote[],
	selectedNoteId: string | null,
	onSelectNote: (noteId: string) => void,
	direction: -1 | 1,
) {
	const noteId = adjacentVisibleNoteId(notes, selectedNoteId, direction);
	if (noteId) onSelectNote(noteId);
}

function adjacentVisibleNoteId(
	notes: MobileNote[],
	selectedNoteId: string | null,
	direction: -1 | 1,
) {
	if (notes.length === 0) return null;
	const currentIndex = Math.max(
		0,
		notes.findIndex((note) => note.id === selectedNoteId),
	);
	const nextIndex = Math.max(
		0,
		Math.min(notes.length - 1, currentIndex + direction),
	);
	return notes[nextIndex]?.id ?? null;
}

function tabletWorkspacePresentationProps(props: TabletWorkspaceProps) {
	const {
		initialCommandPaletteOpen = false,
		initialEditorEditing = true,
		initialEditorEditingMode = "wysiwyg",
		commandPaletteProbe = false,
		keyboardShortcutProbe = false,
		layoutProbe = false,
		onTableOfContentsScrollProof,
		sourceIdleSave = true,
		sourceSelectionProbe = false,
		tableOfContentsProbe = false,
		tabletTransitionProbe = false,
		wysiwygAutocompleteProbe = false,
		wysiwygExternalLinkProbe = false,
		wysiwygFormatCommandProbe = false,
		wysiwygInputTransformProbe = false,
		wysiwygMarkdownBlockProbe = false,
		wysiwygMathEditProbe = false,
		wysiwygTableCommandMutationProbe = false,
		wysiwygWikilinkInsertProbe = false,
		wysiwygMutationProbe = false,
	} = props;
	return {
		initialCommandPaletteOpen,
		initialEditorEditing,
		initialEditorEditingMode,
		commandPaletteProbe,
		keyboardShortcutProbe,
		layoutProbe,
		onTableOfContentsScrollProof,
		sourceIdleSave,
		sourceSelectionProbe,
		tableOfContentsProbe,
		tabletTransitionProbe,
		wysiwygAutocompleteProbe,
		wysiwygExternalLinkProbe,
		wysiwygFormatCommandProbe,
		wysiwygInputTransformProbe,
		wysiwygMarkdownBlockProbe,
		wysiwygMathEditProbe,
		wysiwygTableCommandMutationProbe,
		wysiwygWikilinkInsertProbe,
		wysiwygMutationProbe,
	};
}
