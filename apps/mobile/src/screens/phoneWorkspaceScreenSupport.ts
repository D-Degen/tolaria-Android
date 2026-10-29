import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { AppState, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MobileLayoutProbe } from "../qa/mobileLayoutProbe";
import { resolveDraftLeaveAction } from "../workspace/mobileDraftCleanup";
import type { RegisterMobileEditorCommands } from "../workspace/mobileEditorCommands";
import type { MobileTableOfContentsTarget } from "../workspace/mobileTableOfContents";
import type { MobileNote } from "../workspace/mobileWorkspaceModel";
import { phonePanelDragSurface } from "./phonePanelDragSurface";
import type { PhoneWorkspaceEditorOptions } from "./phoneWorkspaceEditorOptions";
import type { PhoneWorkspaceState } from "./phoneWorkspaceTransitions";
import type { usePhonePanelRail } from "./usePhonePanelRail";
import type { useTabletWorkspaceController } from "./useTabletWorkspaceController";

export type PhoneTableOfContentsTargetRequest = MobileTableOfContentsTarget & {
	requestId: number;
};

export function usePhonePanelDragSurface(state: PhoneWorkspaceState) {
	const { width } = useWindowDimensions();
	const { top, left, right } = useSafeAreaInsets();
	return useCallback(
		(start: { x: number; y: number }) =>
			phonePanelDragSurface(
				state,
				{ x: start.x - left, y: start.y },
				width - left - right,
				top,
			),
		[state, width, top, left, right],
	);
}

export type PhoneWorkspaceController = ReturnType<
	typeof useTabletWorkspaceController
>;
export type PhonePanelRail = ReturnType<typeof usePhonePanelRail>;

type NavigationOptions = {
	controller: PhoneWorkspaceController;
	saveActiveEditor?: () => unknown;
	setPhoneState: (state: PhoneWorkspaceState) => void;
	setSourceModeRequest: Dispatch<SetStateAction<number>>;
};

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
	return (
		typeof value === "object" &&
		value !== null &&
		"then" in value &&
		typeof (value as { then?: unknown }).then === "function"
	);
}

function applyDraftLeaveAction(
	controller: PhoneWorkspaceController,
	note: MobileNote | null,
	flushedContent?: unknown,
	allowDelete = true,
) {
	const candidateNote =
		note && typeof flushedContent === "string"
			? { ...note, rawContent: flushedContent }
			: note;
	const action = resolveDraftLeaveAction(candidateNote);
	if (action.type === "delete" && allowDelete) {
		controller.onDeleteNote();
	} else if (action.type === "rename") {
		if (controller.onUpdateNoteTitle) {
			controller.onUpdateNoteTitle(action.noteId, action.title);
		} else {
			controller.onEditProperty(action.noteId, "title", action.title);
		}
	}
}

export function usePhoneWorkspaceNavigation({
	controller,
	saveActiveEditor,
	setPhoneState,
	setSourceModeRequest,
}: NavigationOptions) {
	const latestRef = useRef({ controller, saveActiveEditor });
	useEffect(() => {
		latestRef.current = { controller, saveActiveEditor };
	});

	useEffect(() => {
		const subscription = AppState.addEventListener?.("change", (nextState) => {
			if (nextState !== "background" && nextState !== "inactive") return;
			const { controller: currentController, saveActiveEditor: currentSave } =
				latestRef.current;
			const currentNote = currentController.selectedNote;
			const flushed = currentSave?.();
			if (isPromiseLike(flushed)) {
				void flushed.then((content) => {
					applyDraftLeaveAction(currentController, currentNote, content, false);
				});
				return;
			}
			applyDraftLeaveAction(currentController, currentNote, flushed, false);
		});
		return () => {
			subscription?.remove();
		};
	}, []);
	const openList = useCallback(() => {
		const leavingNote = controller.selectedNote;
		const flushed = saveActiveEditor?.();
		if (isPromiseLike(flushed)) {
			void flushed.then((content) => {
				applyDraftLeaveAction(controller, leavingNote, content);
				setPhoneState("list");
			});
			return;
		}
		applyDraftLeaveAction(controller, leavingNote, flushed);
		setPhoneState("list");
	}, [controller, saveActiveEditor, setPhoneState]);
	const openSidebar = useCallback(
		() => setPhoneState("sidebar"),
		[setPhoneState],
	);
	const openProperties = useCallback(
		() => setPhoneState("properties"),
		[setPhoneState],
	);
	const openEditor = useCallback(
		(noteId?: string) => {
			if (noteId && noteId !== controller.selectedNoteId) {
				const leavingNote = controller.selectedNote;
				const flushed = saveActiveEditor?.();
				if (isPromiseLike(flushed)) {
					void flushed.then((content) => {
						applyDraftLeaveAction(controller, leavingNote, content);
						controller.onSelectNote(noteId);
						setPhoneState("editor");
					});
					return;
				}
				applyDraftLeaveAction(controller, leavingNote, flushed);
				controller.onSelectNote(noteId);
			}
			setPhoneState("editor");
		},
		[controller, saveActiveEditor, setPhoneState],
	);
	const openSourceEditor = useCallback(() => {
		setSourceModeRequest((current) => current + 1);
		setPhoneState("editor");
	}, [setPhoneState, setSourceModeRequest]);
	const openNeighborhoodList = useCallback(
		(noteId: string) => {
			controller.onEnterNeighborhood(noteId);
			setPhoneState("list");
		},
		[controller, setPhoneState],
	);
	return {
		openEditor,
		openList,
		openNeighborhoodList,
		openProperties,
		openSidebar,
		openSourceEditor,
	};
}

export type PhoneWorkspaceStateViewProps = {
	controller: PhoneWorkspaceController;
	options: PhoneWorkspaceEditorOptions;
	openEditor: (noteId?: string) => void;
	openSourceEditor: () => void;
	openCommandPalette: () => void;
	openList: () => void;
	openProperties: () => void;
	openSidebar: () => void;
	phoneLayoutProbe: MobileLayoutProbe;
	phoneState: PhoneWorkspaceState;
	onRegisterEditorCommands?: RegisterMobileEditorCommands;
	sourceModeRequest: number;
	suggestionNotes: MobileNote[];
	tableOfContentsTarget: PhoneTableOfContentsTargetRequest | null;
};
