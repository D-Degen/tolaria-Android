import type { MobileAttachmentImport } from "../../workspace/mobileAttachments";
import type { TiptapJsonNode } from "../../workspace/mobileDocumentContent";
import type { NativeWysiwygMarkdownBlockAction } from "./MobileWysiwygFormatCommands";

export type NativeWysiwygWikilinkTextNode = {
	marks?: Array<{ attrs: { href: string }; type: "link" }>;
	text: string;
	type: "text";
};

export type NativeWysiwygInsertionResult = {
	inserted: boolean;
	node: TiptapJsonNode;
};

export type NativeWysiwygInlineMatchInput = {
	kind: NativeWysiwygInlineAutocompleteKind;
	position: number;
	projection: NativeWysiwygProjectedInlineText;
	query: string;
	start: number;
};

export type NativeWysiwygProjectedInlineText = {
	cursor: number;
	positions: number[];
	text: string;
};

export type NativeWysiwygWikilinkPayload = {
	label: string;
	target: string;
};

export type NativeWysiwygSelection = {
	from: number;
	to: number;
};

export type NativeWysiwygInlineAutocompleteKind =
	| "emoji"
	| "personMention"
	| "wikilink";

export type NativeWysiwygInlineAutocomplete = {
	kind: NativeWysiwygInlineAutocompleteKind;
	query: string;
	range: NativeWysiwygSelection;
};

export type NativeWysiwygAttachmentPayload = MobileAttachmentImport;

export type NativeWysiwygMarkdownBlockPayload = {
	action: NativeWysiwygMarkdownBlockAction;
};

export type NativeWysiwygPlainTextPayload = {
	text: string;
};

export type NativeWysiwygDuePayload = {
	date: string;
	time?: string | null;
};
