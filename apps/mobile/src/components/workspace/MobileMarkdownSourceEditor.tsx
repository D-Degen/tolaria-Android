import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type NativeSyntheticEvent,
	Pressable,
	type TextInput,
	type TextInputSelectionChangeEventData,
	View,
} from "react-native";
import { mobileText } from "../../i18n/mobileText";
import { nativeSourceSelectionLogLine } from "../../qa/nativeSourceSelectionLog";
import { nativeSourceSelectionProof } from "../../qa/nativeSourceSelectionProbe";
import { MobileChip } from "../../ui/MobileChip";
import { MobileKeyboardAvoidingView } from "../../ui/MobileKeyboardAvoidingView";
import {
	useMobileColors,
	useMobileStyles,
} from "../../ui/theme/useMobileTheme";
import {
	type MobileAttachmentImport,
	mobileAttachmentMarkdown,
} from "../../workspace/mobileAttachments";
import { readMobileClipboardText } from "../../workspace/mobileClipboard";
import { mobileNoteEditableContent } from "../../workspace/mobileDocumentContent";
import {
	type RegisterMobileEditorCommands,
	useRegisteredMobileEditorCommands,
} from "../../workspace/mobileEditorCommands";
import {
	applyMobileMarkdownFormat,
	insertMobileMarkdownPlainText,
	insertMobileMarkdownText,
	type MobileMarkdownFormatAction,
} from "../../workspace/mobileMarkdownFormatting";
import {
	type MobileMarkdownTextSelection,
	mobileMarkdownSelectionAfterTextChange,
} from "../../workspace/mobileMarkdownSourceSelection";
import {
	type MobileSourceFrontmatterIssue,
	mobileSourceFrontmatterIssue,
} from "../../workspace/mobileSourceFrontmatterValidation";
import {
	activeMobileEmojiShortcodeQuery,
	activeMobilePersonMentionQuery,
	activeMobileWikilinkQuery,
	mobilePersonMentionAutocompleteSuggestions,
	mobileWikilinkAutocompleteSuggestions,
	mobileWikilinkAutocompleteTarget,
	replaceActiveMobileEmojiShortcodeQuery,
	replaceActiveMobilePersonMentionQuery,
	replaceActiveMobileWikilinkQuery,
} from "../../workspace/mobileWikilinkAutocomplete";
import type {
	MobileEditorBlock,
	MobileNote,
} from "../../workspace/mobileWorkspaceModel";
import { Input } from "../ui/input";
import { Text } from "../ui/text";
import { MobileMarkdownFormattingToolbar } from "./MobileMarkdownFormattingToolbar";
import { createSourceEditorStyles } from "./MobileMarkdownSourceEditorStyles";
import { SourceEditorInput } from "./MobileSourceEditorInput";
import { mobileWysiwygEmojiPickerSuggestions } from "./MobileWysiwygWikilinkPickerModel";
import { useMobileSourceEditorDraft } from "./useMobileSourceEditorDraft";
import { useMobileSourceFind } from "./useMobileSourceFind";

export type MobileMarkdownSourceEditorProps = {
	blocks: MobileEditorBlock[];
	bullets: string[];
	compact: boolean;
	note: MobileNote;
	notes: MobileNote[];
	onImportAttachment?: () => Promise<MobileAttachmentImport | null>;
	onRegisterEditorCommands?: RegisterMobileEditorCommands;
	onUpdateContent: (noteId: string, content: string) => void;
	idleSave?: boolean;
	plainText?: boolean;
	sourceSelectionProbe?: boolean;
};

type InlineAutocompleteKind = "emoji" | "personMention" | "wikilink";
type MarkdownInlineAutocompleteSuggestion = {
	chipLabel: string;
	emoji?: string;
	id: string;
	note?: MobileNote;
	title: string;
};
type MarkdownInlineAutocompleteReplacement = {
	selection: MobileMarkdownTextSelection;
	text: string;
};

export function MobileMarkdownSourceEditor(
	props: MobileMarkdownSourceEditorProps,
) {
	const {
		blocks,
		bullets,
		note,
		notes,
		onImportAttachment,
		onRegisterEditorCommands,
		onUpdateContent,
		idleSave = true,
		plainText = false,
		sourceSelectionProbe = false,
	} = props;

	if (plainText) {
		return (
			<MobilePlainTextSourceEditor
				note={note}
				onRegisterEditorCommands={onRegisterEditorCommands}
				onUpdateContent={onUpdateContent}
				idleSave={idleSave}
				sourceSelectionProbe={sourceSelectionProbe}
			/>
		);
	}

	return (
		<MarkdownSourceEditor
			blocks={blocks}
			bullets={bullets}
			note={note}
			notes={notes}
			onImportAttachment={onImportAttachment}
			onRegisterEditorCommands={onRegisterEditorCommands}
			onUpdateContent={onUpdateContent}
			idleSave={idleSave}
			sourceSelectionProbe={sourceSelectionProbe}
		/>
	);
}

function MarkdownSourceEditor(
	props: Omit<MobileMarkdownSourceEditorProps, "plainText" | "compact">,
) {
	const themeStyles = useMobileStyles(createSourceEditorStyles);
	const { editorStyles } = themeStyles;
	const { autocomplete, editorDraft, find, findInputRef, frontmatterIssue } =
		useMarkdownSourceDraft(props);

	return (
		<MobileKeyboardAvoidingView
			style={editorStyles.container}
			testID="editor-markdown-form"
		>
			{find.bar}
			<MobileSourceFrontmatterIssueBanner issue={frontmatterIssue} />
			<View style={editorStyles.editorBody}>
				<SourceEditorInput
					inputRef={findInputRef}
					findMatch={find.active}
					editable={!editorDraft.paused}
					onBlur={editorDraft.save}
					testID="editor-markdown-input"
					value={editorDraft.content}
					selection={autocomplete.controlledSelection}
					onChangeText={autocomplete.handleMarkdownChange}
					onSelectionChange={autocomplete.handleSelectionChange}
				/>
				<InlineAutocompleteSuggestions autocomplete={autocomplete} />
			</View>
			<View style={editorStyles.toolbarHost}>
				<MobileMarkdownFormattingToolbar onFormat={autocomplete.applyFormat} />
			</View>
		</MobileKeyboardAvoidingView>
	);
}

function useMarkdownSourceDraft(
	props: Omit<MobileMarkdownSourceEditorProps, "plainText" | "compact">,
) {
	const {
		blocks,
		bullets,
		note,
		notes,
		onImportAttachment,
		onRegisterEditorCommands,
		onUpdateContent,
		idleSave,
		sourceSelectionProbe,
	} = props;

	const sourceContent = mobileNoteEditableContent({
		...note,
		editorBlocks: note.editorBlocks ?? blocks,
		editorBullets: bullets,
	});
	const findInputRef = useRef<TextInput>(null);
	const editorDraft = useMobileSourceEditorDraft({
		inputRef: findInputRef,
		noteId: note.id,
		idleSave,
		onCommit: onUpdateContent,
		sourceContent,
	});
	const autocomplete = useMarkdownInlineAutocomplete({
		content: editorDraft.content,
		noteId: note.id,
		notes,
		onImportAttachment,
		sourceNote: note,
		onUpdateContent: editorDraft.updateContent,
	});
	const frontmatterIssue = mobileSourceFrontmatterIssue(editorDraft.content);
	const find = useMobileSourceFind({
		input: findInputRef,
		content: editorDraft.content,
		register: onRegisterEditorCommands,
		onUpdate: (content) => editorDraft.updateContent(note.id, content),
	});
	useRegisteredMobileEditorCommands(onRegisterEditorCommands, {
		pastePlainText: () => {
			void autocomplete.applyFormat("pastePlainText");
		},
		save: editorDraft.save,
	});
	useNativeSourceSelectionProbe(sourceSelectionProbe === true);
	return { autocomplete, editorDraft, find, findInputRef, frontmatterIssue };
}

function InlineAutocompleteSuggestions({
	autocomplete,
}: {
	autocomplete: ReturnType<typeof useMarkdownInlineAutocomplete>;
}) {
	const { editorStyles } = useMobileStyles(createSourceEditorStyles);
	if (autocomplete.suggestions.length === 0) return null;
	return (
		<View
			style={editorStyles.suggestions}
			testID={autocomplete.suggestionsTestId}
		>
			{autocomplete.suggestions.map((suggestion) => (
				<Pressable
					accessibilityLabel={suggestion.title}
					accessibilityRole="button"
					key={suggestion.id}
					style={({ pressed }) => [
						editorStyles.suggestionRow,
						pressed ? editorStyles.suggestionRowPressed : null,
					]}
					testID={`${autocomplete.rowTestIdPrefix}-${testIdSegment(suggestion.id)}`}
					onPress={() => autocomplete.insertSuggestion(suggestion)}
				>
					<Text numberOfLines={1} style={editorStyles.suggestionTitle}>
						{suggestion.title}
					</Text>
					<MobileChip label={suggestion.chipLabel} tone="gray" />
				</Pressable>
			))}
		</View>
	);
}

function MobileSourceFrontmatterIssueBanner({
	issue,
}: {
	issue: MobileSourceFrontmatterIssue | null;
}) {
	const themeStyles = useMobileStyles(createSourceEditorStyles);
	const { editorStyles } = themeStyles;
	if (!issue) return null;

	return (
		<View
			accessibilityRole="alert"
			style={editorStyles.frontmatterIssue}
			testID="editor-markdown-yaml-error"
		>
			<Text selectable style={editorStyles.frontmatterIssueLabel}>
				{mobileText("editor.source.yamlErrorLabel")}
			</Text>
			<Text selectable style={editorStyles.frontmatterIssueText}>
				{mobileSourceFrontmatterIssueText(issue)}
			</Text>
		</View>
	);
}

function mobileSourceFrontmatterIssueText(issue: MobileSourceFrontmatterIssue) {
	if (issue === "tabIndentation")
		return mobileText("editor.source.yamlError.tabIndentation");
	return mobileText("editor.source.yamlError.unclosedFrontmatter");
}

type PlainTextSourceEditorProps = Pick<
	MobileMarkdownSourceEditorProps,
	| "idleSave"
	| "note"
	| "onRegisterEditorCommands"
	| "onUpdateContent"
	| "sourceSelectionProbe"
>;

function MobilePlainTextSourceEditor(props: PlainTextSourceEditorProps) {
	const { editorStyles } = useMobileStyles(createSourceEditorStyles);
	const mobileColors = useMobileColors();
	const {
		content,
		controlledSelection,
		find,
		findInputRef,
		handleSelectionChange,
		handleTextChange,
		paused,
		save,
	} = usePlainTextSourceDraft(props);
	return (
		<MobileKeyboardAvoidingView
			style={editorStyles.container}
			testID="editor-text-file-form"
		>
			{find.bar}
			<Input
				ref={findInputRef}
				multiline
				scrollEnabled
				editable={!paused}
				onBlur={save}
				placeholderTextColor={mobileColors.textFaint}
				style={editorStyles.input}
				testID="editor-text-file-input"
				textAlignVertical="top"
				value={content}
				selection={controlledSelection}
				onChangeText={handleTextChange}
				onSelectionChange={handleSelectionChange}
			/>
		</MobileKeyboardAvoidingView>
	);
}

function usePlainTextSourceDraft({
	note,
	onRegisterEditorCommands,
	onUpdateContent,
	idleSave,
	sourceSelectionProbe,
}: PlainTextSourceEditorProps) {
	const findInputRef = useRef<TextInput>(null);
	const { content, paused, save, updateContent } = useMobileSourceEditorDraft({
		inputRef: findInputRef,
		plainText: true,
		noteId: note.id,
		idleSave,
		onCommit: onUpdateContent,
		sourceContent: note.rawContent ?? "",
	});
	const find = useMobileSourceFind({
		input: findInputRef,
		content,
		register: onRegisterEditorCommands,
		onUpdate: (value) => updateContent(note.id, value),
	});
	const [selection, setSelection] = useState<MobileMarkdownTextSelection>(
		textStartSelection(),
	);
	const [controlledSelection, setControlledSelection] = useState<
		MobileMarkdownTextSelection | undefined
	>(textStartSelection());
	const handleSelectionChange = useCallback(
		(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
			setSelection(event.nativeEvent.selection);
			setControlledSelection(undefined);
		},
		[],
	);
	const handleTextChange = useCallback(
		(nextContent: string) => {
			updateContent(note.id, nextContent);
			setSelection(
				mobileMarkdownSelectionAfterTextChange(content, nextContent, selection),
			);
			setControlledSelection(undefined);
		},
		[content, note.id, selection, updateContent],
	);
	const pastePlainText = useCallback(
		() =>
			pasteSourceText(content, selection, (result) => {
				updateContent(note.id, result.text);
				setSelection(result.selection);
				setControlledSelection(result.selection);
			}),
		[content, note.id, selection, updateContent],
	);
	useRegisteredMobileEditorCommands(onRegisterEditorCommands, {
		pastePlainText,
		save,
	});
	useNativeSourceSelectionProbe(sourceSelectionProbe === true);

	return {
		content,
		controlledSelection,
		find,
		findInputRef,
		handleSelectionChange,
		handleTextChange,
		paused,
		save,
	};
}

function useNativeSourceSelectionProbe(enabled: boolean) {
	useEffect(() => {
		if (!enabled) return undefined;

		const timer = setTimeout(() => {
			console.info(nativeSourceSelectionLogLine(nativeSourceSelectionProof()));
		}, 250);

		return () => clearTimeout(timer);
	}, [enabled]);
}

function useMarkdownInlineAutocomplete({
	content,
	noteId,
	notes,
	onImportAttachment,
	sourceNote,
	onUpdateContent,
}: {
	content: string;
	noteId: string;
	notes: MobileNote[];
	onImportAttachment?: () => Promise<MobileAttachmentImport | null>;
	sourceNote: MobileNote;
	onUpdateContent: (noteId: string, content: string) => void;
}) {
	const [selection, setSelection] = useState<MobileMarkdownTextSelection>(
		textStartSelection(),
	);
	const [controlledSelection, setControlledSelection] = useState<
		MobileMarkdownTextSelection | undefined
	>(textStartSelection());
	const state = useMemo(
		() => markdownInlineAutocompleteState(content, selection.start, notes),
		[content, notes, selection.start],
	);

	const handleSelectionChange = useCallback(
		(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
			setSelection(event.nativeEvent.selection);
			setControlledSelection(undefined);
		},
		[],
	);
	const handleMarkdownChange = useCallback(
		(nextContent: string) => {
			onUpdateContent(noteId, nextContent);
			const nextSelection = mobileMarkdownSelectionAfterTextChange(
				content,
				nextContent,
				selection,
			);
			const activeAutocomplete = hasActiveInlineAutocomplete(
				nextContent,
				nextSelection.start,
			);
			setSelection(nextSelection);
			setControlledSelection(activeAutocomplete ? nextSelection : undefined);
		},
		[content, noteId, onUpdateContent, selection],
	);
	const applyFormat = useCallback(
		async (action: MobileMarkdownFormatAction) => {
			if (action === "pastePlainText") {
				await pasteSourceText(content, selection, (result) => {
					onUpdateContent(noteId, result.text);
					setSelection(result.selection);
					setControlledSelection(result.selection);
				});
				return;
			}

			if (action === "attachment") {
				const attachment = await onImportAttachment?.();
				if (!attachment) return;

				const result = insertMobileMarkdownText({
					selection,
					text: content,
					value: mobileAttachmentMarkdown(attachment),
				});
				onUpdateContent(noteId, result.text);
				setSelection(result.selection);
				setControlledSelection(result.selection);
				return;
			}

			const result = applyMobileMarkdownFormat(content, selection, action);
			onUpdateContent(noteId, result.text);
			setSelection(result.selection);
			setControlledSelection(result.selection);
		},
		[content, noteId, onImportAttachment, onUpdateContent, selection],
	);
	const insertSuggestion = useCallback(
		(suggestion: MarkdownInlineAutocompleteSuggestion) => {
			const replacement = markdownInlineAutocompleteReplacement({
				content,
				cursor: selection.start,
				kind: state.kind,
				sourceNote,
				suggestion,
			});
			if (!replacement) return;

			const nextSelection = replacement.selection;
			onUpdateContent(noteId, replacement.text);
			setSelection(nextSelection);
			setControlledSelection(nextSelection);
		},
		[content, noteId, onUpdateContent, selection.start, sourceNote, state.kind],
	);

	return {
		applyFormat,
		controlledSelection,
		handleMarkdownChange,
		handleSelectionChange,
		insertSuggestion,
		rowTestIdPrefix: inlineAutocompleteRowTestIdPrefix(state.kind),
		suggestions: state.suggestions,
		suggestionsTestId: inlineAutocompleteTestId(state.kind),
	};
}

function markdownInlineAutocompleteState(
	content: string,
	cursor: number,
	notes: MobileNote[],
) {
	const wikilinkMatch = activeMobileWikilinkQuery(content, cursor);
	if (wikilinkMatch) {
		return {
			kind: "wikilink" as const,
			suggestions: noteAutocompleteSuggestions(
				mobileWikilinkAutocompleteSuggestions(notes, wikilinkMatch.query),
			),
		};
	}

	const personMentionMatch = activeMobilePersonMentionQuery(content, cursor);
	if (personMentionMatch) {
		return {
			kind: "personMention" as const,
			suggestions: noteAutocompleteSuggestions(
				mobilePersonMentionAutocompleteSuggestions(
					notes,
					personMentionMatch.query,
				),
			),
		};
	}

	const emojiMatch = activeMobileEmojiShortcodeQuery(content, cursor);
	if (emojiMatch) {
		return {
			kind: "emoji" as const,
			suggestions: emojiAutocompleteSuggestions(emojiMatch.query),
		};
	}

	return {
		kind: null,
		suggestions: [],
	};
}

function markdownInlineAutocompleteReplacement({
	content,
	cursor,
	kind,
	sourceNote,
	suggestion,
}: {
	content: string;
	cursor: number;
	kind: InlineAutocompleteKind | null;
	sourceNote: MobileNote;
	suggestion: MarkdownInlineAutocompleteSuggestion;
}): MarkdownInlineAutocompleteReplacement | null {
	if (kind === null) return null;
	if (kind === "emoji") {
		return suggestion.emoji
			? replacementFromCursor(
					replaceActiveMobileEmojiShortcodeQuery(
						content,
						cursor,
						suggestion.emoji,
					),
				)
			: null;
	}
	if (!suggestion.note) return null;

	const target = mobileWikilinkAutocompleteTarget(suggestion.note, sourceNote);
	return kind === "personMention"
		? replacementFromCursor(
				replaceActiveMobilePersonMentionQuery(content, cursor, target),
			)
		: replacementFromCursor(
				replaceActiveMobileWikilinkQuery(content, cursor, target),
			);
}

function replacementFromCursor(
	result: { cursor: number; text: string } | null,
): MarkdownInlineAutocompleteReplacement | null {
	if (!result) return null;
	return {
		selection: { end: result.cursor, start: result.cursor },
		text: result.text,
	};
}

function hasActiveInlineAutocomplete(text: string, cursor: number): boolean {
	if (activeMobileWikilinkQuery(text, cursor)) return true;
	if (activeMobilePersonMentionQuery(text, cursor)) return true;
	return activeMobileEmojiShortcodeQuery(text, cursor) !== null;
}

async function pasteSourceText(
	content: string,
	selection: MobileMarkdownTextSelection,
	apply: (result: ReturnType<typeof insertMobileMarkdownPlainText>) => void,
) {
	const value = await readMobileClipboardText();
	if (value)
		apply(insertMobileMarkdownPlainText({ selection, text: content, value }));
}

function textStartSelection(): MobileMarkdownTextSelection {
	return { end: 0, start: 0 };
}

function inlineAutocompleteTestId(kind: InlineAutocompleteKind | null): string {
	if (kind === "emoji") return "editor-emoji-suggestions";
	return kind === "personMention"
		? "editor-person-mention-suggestions"
		: "editor-wikilink-suggestions";
}

function inlineAutocompleteRowTestIdPrefix(
	kind: InlineAutocompleteKind | null,
): string {
	if (kind === "emoji") return "editor-emoji-suggestion";
	return kind === "personMention"
		? "editor-person-mention-suggestion"
		: "editor-wikilink-suggestion";
}

function noteAutocompleteSuggestions(
	notes: MobileNote[],
): MarkdownInlineAutocompleteSuggestion[] {
	return notes.map((note) => ({
		chipLabel: note.type,
		id: note.id,
		note,
		title: note.title,
	}));
}

function emojiAutocompleteSuggestions(
	query: string,
): MarkdownInlineAutocompleteSuggestion[] {
	return mobileWysiwygEmojiPickerSuggestions(query).map((entry) => ({
		chipLabel: entry.emoji,
		emoji: entry.emoji,
		id: entry.name,
		title: entry.name,
	}));
}

function testIdSegment(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}
