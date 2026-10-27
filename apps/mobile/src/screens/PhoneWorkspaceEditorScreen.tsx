import { type ReactNode, useCallback } from "react";
import { View } from "react-native";
import { probeProps } from "../qa/mobileLayoutProbe";
import { useMobileStyles } from "../ui/theme/useMobileTheme";
import type { RegisterMobileEditorCommands } from "../workspace/mobileEditorCommands";
import { mobileNoteIdForWikilinkTarget } from "../workspace/mobileWikilinks";
import type { MobileNote } from "../workspace/mobileWorkspaceModel";
import { PhoneBackButton, PhoneTopBar } from "./PhoneWorkspaceChrome";
import type { PhoneWorkspaceEditorOptions } from "./phoneWorkspaceEditorOptions";
import type {
	PhoneTableOfContentsTargetRequest,
	PhoneWorkspaceController,
	PhoneWorkspaceStateViewProps,
} from "./phoneWorkspaceScreenSupport";
import { createThemeStyles } from "./phoneWorkspaceStyles";
import { TabletEditorPanel } from "./TabletEditorPanel";

type PhoneEditorBodyProps = {
	controller: PhoneWorkspaceController;
	leading?: ReactNode;
	notes: MobileNote[];
	onNavigateWikilink: (target: string) => void;
	onRegisterEditorCommands?: RegisterMobileEditorCommands;
	options: PhoneWorkspaceEditorOptions;
	sourceModeRequest: number;
	tableOfContentsTarget: PhoneTableOfContentsTargetRequest | null;
};

function PhoneEditorBody(props: PhoneEditorBodyProps) {
	const {
		controller,
		leading,
		notes,
		onNavigateWikilink,
		onRegisterEditorCommands,
		options,
		sourceModeRequest,
		tableOfContentsTarget,
	} = props;
	const sourceModeRequested = sourceModeRequest > 0;

	return (
		<TabletEditorPanel
			key={`phone-editor-${controller.selectedNote?.id ?? "none"}-${sourceModeRequest}`}
			blocks={controller.editorBlocks}
			bullets={controller.editorBullets}
			compact
			initialEditing={sourceModeRequested || options.initialEditorEditing}
			initialEditingMode={
				sourceModeRequested ? "source" : options.initialEditorEditingMode
			}
			layoutProbe={options.layoutProbe}
			leading={leading}
			note={controller.selectedNote}
			noteRead={controller.selectedNoteRead}
			notes={notes}
			onNavigateWikilink={onNavigateWikilink}
			onOpenChangeNoteType={controller.onOpenChangeNoteType}
			onOpenMoreActions={controller.onOpenMoreActions}
			onRegisterEditorCommands={onRegisterEditorCommands}
			onToggleFavorite={controller.onToggleFavorite}
			onUpdateContent={controller.onUpdateNoteContent}
			onUpdateTitle={(noteId, title) => {
				controller.onEditProperty(noteId, "title", title);
			}}
			renameFilename={{
				value: controller.readOnlyForm.filenameStem,
				notes,
				onChange: controller.onFilenameStemChange,
				onSubmit: controller.onRenameNoteFile,
			}}
			sourceIdleSave={options.sourceIdleSave}
			sourceSelectionProbe={options.sourceSelectionProbe}
			tableOfContentsTarget={tableOfContentsTarget}
			typeDefinitions={controller.snapshot.typeDefinitions}
			vaultRootUri={controller.vaultRootUri}
			wysiwygAutocompleteProbe={options.wysiwygAutocompleteProbe}
			wysiwygExternalLinkProbe={options.wysiwygExternalLinkProbe}
			wysiwygFormatCommandProbe={options.wysiwygFormatCommandProbe}
			wysiwygInputTransformProbe={options.wysiwygInputTransformProbe}
			wysiwygMarkdownBlockProbe={options.wysiwygMarkdownBlockProbe}
			wysiwygMathEditProbe={options.wysiwygMathEditProbe}
			wysiwygTableCommandMutationProbe={
				options.wysiwygTableCommandMutationProbe
			}
			wysiwygWikilinkInsertProbe={options.wysiwygWikilinkInsertProbe}
			wysiwygMutationProbe={options.wysiwygMutationProbe}
		/>
	);
}

type UsePhoneWikilinkNavigationProps = {
	controller: PhoneWorkspaceController;
	suggestionNotes: MobileNote[];
};

function usePhoneWikilinkNavigation({
	controller,
	suggestionNotes,
}: UsePhoneWikilinkNavigationProps) {
	return useCallback(
		(target: string) => {
			const noteId = mobileNoteIdForWikilinkTarget(suggestionNotes, target);
			if (!noteId) return;

			controller.onSelectNote(noteId);
		},
		[controller, suggestionNotes],
	);
}

export function PhoneEditorScreen(props: PhoneWorkspaceStateViewProps) {
	const {
		controller,
		options,
		openList,
		onRegisterEditorCommands,
		phoneLayoutProbe,
		sourceModeRequest,
		suggestionNotes,
		tableOfContentsTarget,
	} = props;
	const { styles } = useMobileStyles(createThemeStyles);
	const handleNavigateWikilink = usePhoneWikilinkNavigation({
		controller,
		suggestionNotes,
	});

	return (
		<View
			{...probeProps(phoneLayoutProbe, "phone.editor.screen")}
			style={styles.screen}
			testID="phone-editor-screen"
		>
			{!controller.selectedNote && <PhoneTopBar title="" onBack={openList} />}
			<PhoneEditorBody
				controller={controller}
				leading={<PhoneBackButton onBack={openList} />}
				notes={suggestionNotes}
				onNavigateWikilink={handleNavigateWikilink}
				onRegisterEditorCommands={onRegisterEditorCommands}
				options={options}
				sourceModeRequest={sourceModeRequest}
				tableOfContentsTarget={tableOfContentsTarget}
			/>
		</View>
	);
}
