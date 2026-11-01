import type { EditorBridge } from "@10play/tentap-editor";
import {
	nativeWysiwygMarkdownBlockProbePayloads,
	nativeWysiwygMarkdownBlockProbePlainTextPayload,
	nativeWysiwygMarkdownBlockProbeTableGrowthJson,
} from "../../qa/nativeWysiwygMarkdownBlockProbe";
import { readMobileClipboardText } from "../../workspace/mobileClipboard";
import { nativeWysiwygDocumentWithInputTransforms } from "../../workspace/mobileWysiwygInputTransforms";
import type {
	EditorStateReadableBridge,
	NativeTentapEditorSurfaceProps,
	NativeWysiwygDocumentBuilder,
	NativeWysiwygEditorState,
	SelectionSettableEditorBridge,
} from "./MobileNativeEditor.types";
import { isJsonReadableEditorBridge } from "./MobileWysiwygDocumentReads.native";
import {
	isContentSettableEditorBridge,
	type NativeTentapEditorRefs,
} from "./MobileWysiwygEditorLifecycle.native";
import { nativeWysiwygDocumentWithoutExternalLink } from "./MobileWysiwygExternalLinkBridgeModel";
import type { NativeWysiwygCommandBridge } from "./MobileWysiwygFormatCommands";
import {
	type NativeWysiwygAttachmentPayload,
	type NativeWysiwygDuePayload,
	type NativeWysiwygInlineAutocomplete,
	type NativeWysiwygMarkdownBlockPayload,
	type NativeWysiwygPlainTextPayload,
	type NativeWysiwygSelection,
	type NativeWysiwygWikilinkPayload,
	nativeWysiwygDocumentWithInsertedAttachment,
	nativeWysiwygDocumentWithInsertedDue,
	nativeWysiwygDocumentWithInsertedMarkdownBlock,
	nativeWysiwygDocumentWithInsertedPlainText,
	nativeWysiwygDocumentWithInsertedWikilink,
	nativeWysiwygInlineAutocompleteAtSelection,
} from "./MobileWysiwygWikilinkBridgeModel";
import { nativeWysiwygBlockMathRenderProof } from "./useMobileNativeEditorProbes";

export type { NativeWysiwygSelection } from "./mobileNativeWikilink.types";
export async function insertImportedAttachment(
	onImportAttachment: NativeTentapEditorSurfaceProps["onImportAttachment"],
	insertAttachment: NativeTentapEditorSurfaceProps["insertAttachment"],
) {
	const attachment = await onImportAttachment?.();
	if (attachment) insertAttachment(attachment);
}

export async function insertClipboardPlainText(
	insertPlainText: NativeTentapEditorSurfaceProps["insertPlainText"],
) {
	const text = await readMobileClipboardText();
	if (text) insertPlainText({ text });
}

export function settleNativeWysiwygEditorContent(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 60);
	});
}

export async function insertWikilinkIntoNativeEditor(
	editor: EditorBridge | null,
	payload: NativeWysiwygWikilinkPayload,
	selection?: NativeWysiwygSelection,
): Promise<boolean> {
	return insertPayloadIntoNativeEditor(
		editor,
		payload,
		selection,
		nativeWysiwygDocumentWithInsertedWikilink,
	);
}

export async function insertAttachmentIntoNativeEditor(
	editor: EditorBridge | null,
	payload: NativeWysiwygAttachmentPayload,
	selection?: NativeWysiwygSelection,
): Promise<boolean> {
	return insertPayloadIntoNativeEditor(
		editor,
		payload,
		selection,
		nativeWysiwygDocumentWithInsertedAttachment,
	);
}

export async function insertMarkdownBlockIntoNativeEditor(
	editor: EditorBridge | null,
	payload: NativeWysiwygMarkdownBlockPayload,
	selection?: NativeWysiwygSelection,
): Promise<boolean> {
	return insertPayloadIntoNativeEditor(
		editor,
		payload,
		selection,
		nativeWysiwygDocumentWithInsertedMarkdownBlock,
	);
}

export async function insertPlainTextIntoNativeEditor(
	editor: EditorBridge | null,
	payload: NativeWysiwygPlainTextPayload,
	selection?: NativeWysiwygSelection,
): Promise<boolean> {
	return insertPayloadIntoNativeEditor(
		editor,
		payload,
		selection,
		nativeWysiwygDocumentWithInsertedPlainText,
	);
}

export async function insertDueIntoNativeEditor(
	editor: EditorBridge | null,
	payload: NativeWysiwygDuePayload,
	selection?: NativeWysiwygSelection,
): Promise<boolean> {
	return insertPayloadIntoNativeEditor(
		editor,
		payload,
		selection,
		nativeWysiwygDocumentWithInsertedDue,
	);
}

async function insertMarkdownBlocksIntoNativeEditor(
	editor: EditorBridge | null,
	payloads: NativeWysiwygMarkdownBlockPayload[],
	refs: NativeTentapEditorRefs,
): Promise<boolean> {
	if (
		!isJsonReadableEditorBridge(editor) ||
		!isContentSettableEditorBridge(editor)
	)
		return false;

	let nextJson: unknown = await editor.getJSON();
	const plainTextJson = nativeWysiwygDocumentWithInsertedPlainText({
		json: nextJson,
		payload: nativeWysiwygMarkdownBlockProbePlainTextPayload(),
	});
	if (!plainTextJson) return false;

	nextJson = plainTextJson;
	for (const payload of payloads) {
		const insertedJson = nativeWysiwygDocumentWithInsertedMarkdownBlock({
			json: nextJson,
			payload,
		});
		if (!insertedJson) return false;
		nextJson = insertedJson;
	}
	nextJson = nativeWysiwygMarkdownBlockProbeTableGrowthJson(nextJson);
	editor.setContent(nextJson);
	refs.markdownBlockRenderProofRef.current =
		await nativeWysiwygBlockMathRenderProof(editor);
	refs.markdownBlockProofReadyRef.current = true;
	return true;
}

export function insertNativeWysiwygMarkdownBlockProbe(
	editor: EditorBridge | null,
	refs: NativeTentapEditorRefs,
): Promise<boolean> {
	return insertMarkdownBlocksIntoNativeEditor(
		editor,
		nativeWysiwygMarkdownBlockProbePayloads(),
		refs,
	);
}

async function insertPayloadIntoNativeEditor<Payload>(
	editor: EditorBridge | null,
	payload: Payload,
	selection: NativeWysiwygSelection | undefined,
	buildDocument: NativeWysiwygDocumentBuilder<Payload>,
): Promise<boolean> {
	if (
		!isJsonReadableEditorBridge(editor) ||
		!isContentSettableEditorBridge(editor)
	)
		return false;

	const json = await editor.getJSON();
	const nextJson = buildDocument({
		json,
		payload,
		selection: selection ?? nativeWysiwygEditorSelection(editor),
	});
	if (!nextJson) return false;

	editor.setContent(nextJson);
	return true;
}

export function nativeWysiwygEditorSelection(
	editor: EditorBridge,
): NativeWysiwygSelection | undefined {
	const selection = nativeWysiwygEditorState(editor)?.selection;
	if (typeof selection?.from !== "number" || typeof selection.to !== "number")
		return undefined;

	return {
		from: selection.from,
		to: selection.to,
	};
}

export const nativeWysiwygEditorState = (
	editor: EditorBridge | null,
): NativeWysiwygEditorState | null =>
	isEditorStateReadableBridge(editor) ? editor.getEditorState() : null;

export function applyNativeWysiwygExternalLink(
	editor: EditorBridge,
	url: string | null,
	flushEditorDocument: () => void,
	selection?: NativeWysiwygSelection,
): void {
	if (selection && isSelectionSettableEditorBridge(editor)) {
		editor.setSelection(selection.from, selection.to);
	}
	if (url === null) {
		void removeNativeWysiwygExternalLink(
			editor,
			selection,
			flushEditorDocument,
		);
		return;
	}

	const commandBridge = editor as NativeWysiwygCommandBridge;
	if (typeof commandBridge.setLink !== "function") return;

	commandBridge.setLink(url);
	setTimeout(flushEditorDocument, 250);
}

async function removeNativeWysiwygExternalLink(
	editor: EditorBridge,
	selection: NativeWysiwygSelection | undefined,
	flushEditorDocument: () => void,
): Promise<void> {
	if (
		!isJsonReadableEditorBridge(editor) ||
		!isContentSettableEditorBridge(editor)
	)
		return;

	const nextJson = nativeWysiwygDocumentWithoutExternalLink({
		json: await editor.getJSON(),
		selection,
	});
	if (!nextJson) return;

	editor.setContent(nextJson);
	setTimeout(flushEditorDocument, 250);
}

export async function applyNativeWysiwygInputTransforms(
	editor: EditorBridge | null,
): Promise<boolean> {
	if (
		!isJsonReadableEditorBridge(editor) ||
		!isContentSettableEditorBridge(editor)
	)
		return false;

	const nextJson = nativeWysiwygDocumentWithInputTransforms({
		json: await editor.getJSON(),
		selection: nativeWysiwygEditorSelection(editor),
	});
	if (!nextJson) return false;

	editor.setContent(nextJson);
	return true;
}

export async function detectNativeWysiwygInlineAutocomplete(
	editor: EditorBridge | null,
): Promise<NativeWysiwygInlineAutocomplete | null> {
	if (!isJsonReadableEditorBridge(editor)) return null;

	return nativeWysiwygInlineAutocompleteAtSelection({
		json: await editor.getJSON(),
		selection: nativeWysiwygEditorSelection(editor),
	});
}

function isEditorStateReadableBridge(
	editor: EditorBridge | null,
): editor is EditorStateReadableBridge {
	return (
		typeof (editor as Partial<EditorStateReadableBridge> | null)
			?.getEditorState === "function"
	);
}

function isSelectionSettableEditorBridge(
	editor: EditorBridge | null,
): editor is SelectionSettableEditorBridge {
	return (
		typeof (editor as Partial<SelectionSettableEditorBridge> | null)
			?.setSelection === "function"
	);
}
