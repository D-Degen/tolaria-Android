import { describe, expect, it } from "vitest";
import {
	type TiptapJsonNode,
	tiptapJsonToMobileMarkdown,
} from "../../workspace/mobileDocumentContent";
import type { NativeWysiwygMarkdownBlockAction } from "./MobileWysiwygFormatCommands";
import {
	type NativeWysiwygSelection,
	type NativeWysiwygWikilinkPayload,
	nativeWysiwygAttachmentContent,
	nativeWysiwygDocumentWithInsertedAttachment,
	nativeWysiwygDocumentWithInsertedDue,
	nativeWysiwygDocumentWithInsertedMarkdownBlock,
	nativeWysiwygDocumentWithInsertedPlainText,
	nativeWysiwygDocumentWithInsertedWikilink,
	nativeWysiwygDueContent,
	nativeWysiwygInlineAutocompleteAtSelection,
	nativeWysiwygPlainTextContent,
	nativeWysiwygWikilinkContent,
} from "./MobileWysiwygWikilinkBridgeModel";

describe("native WYSIWYG wikilink bridge", () => {
	it("builds TenTap inline content that serializes as a desktop wikilink", () => {
		expect(
			nativeWysiwygWikilinkContent({
				label: "Mobile UI",
				target: "Tolaria/Mobile UI",
			}),
		).toEqual([
			{
				marks: [
					{
						attrs: { href: "tolaria://wikilink/Tolaria%2FMobile%20UI" },
						type: "link",
					},
				],
				text: "Mobile UI",
				type: "text",
			},
			{ text: " ", type: "text" },
		]);
	});

	it("falls back to the target when the display label is blank", () => {
		expect(
			nativeWysiwygWikilinkContent({
				label: "   ",
				target: "AI Ops Guide",
			})?.[0],
		).toMatchObject({
			text: "AI Ops Guide",
		});
	});

	it("ignores blank targets", () => {
		expect(
			nativeWysiwygWikilinkContent({ label: "Empty", target: "  " }),
		).toBeNull();
	});

	it("builds TenTap attachment links that serialize as portable vault attachment markdown", () => {
		expect(
			nativeWysiwygAttachmentContent({
				mimeType: "application/pdf",
				name: "project brief.pdf",
				path: "attachments/project brief.pdf",
			}),
		).toEqual([
			{
				marks: [
					{ attrs: { href: "attachments/project brief.pdf" }, type: "link" },
				],
				text: "project brief.pdf",
				type: "text",
			},
			{ text: " ", type: "text" },
		]);
	});

	it("builds unmarked TenTap content for paste without formatting", () => {
		expect(nativeWysiwygPlainTextContent({ text: "Plain\nText" })).toEqual([
			{ text: "Plain", type: "text" },
			{ type: "hardBreak" },
			{ text: "Text", type: "text" },
		]);
	});

	it("inserts non-image attachments at the current native editor selection", () => {
		const nextDocument = nativeWysiwygDocumentWithInsertedAttachment({
			json: documentNode(paragraphNode("See  today.")),
			payload: {
				mimeType: "application/pdf",
				name: "project brief.pdf",
				path: "attachments/project brief.pdf",
			},
			selection: { from: 5, to: 5 },
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(
			"See [project brief.pdf](<attachments/project brief.pdf>) today.",
		);
	});

	it("inserts image attachments as portable image blocks after the active block", () => {
		const nextDocument = nativeWysiwygDocumentWithInsertedAttachment({
			json: documentNode(paragraphNode("Intro"), paragraphNode("Tail")),
			payload: {
				mimeType: "image/png",
				name: "mobile diagram.png",
				path: "attachments/mobile diagram.png",
			},
			selection: { from: 3, to: 3 },
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(
			"Intro\n\n![mobile diagram.png](<attachments/mobile diagram.png>)\n\nTail",
		);
	});

	it.each([
		["divider", "Intro\n\n---\n\nTail"],
		["codeBlock", "Intro\n\n```text\ncode\n```\n\nTail"],
		["mathBlock", "Intro\n\n$$\n\\sqrt{a^2 + b^2}\n$$\n\nTail"],
		[
			"mermaid",
			'Intro\n\n```mermaid\nflowchart TD\n    edit["Switch to the raw editor to edit"]\n```\n\nTail',
		],
		[
			"table",
			"Intro\n\n| Column | Value |\n| --- | --- |\n| Item | Detail |\n\nTail",
		],
	] as const)(
		"inserts native WYSIWYG %s as durable desktop markdown",
		(action, expectedMarkdown) => {
			const nextDocument = insertedMarkdownBlock(action);
			expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(expectedMarkdown);
		},
	);

	it.each([
		[
			"codeBlock",
			{
				attrs: { language: "text" },
				content: [{ text: "code", type: "text" }],
				type: "codeBlock",
			},
		],
		[
			"mathBlock",
			{
				attrs: { latex: "\\sqrt{a^2 + b^2}" },
				type: "mathBlock",
			},
		],
	] as const)(
		"inserts native WYSIWYG %s as a structured TenTap node before markdown serialization",
		(action, expectedNode) => {
			const nextDocument = insertedMarkdownBlock(action);
			expect(nextDocument?.content?.[1]).toMatchObject(expectedNode);
		},
	);

	it("inserts native WYSIWYG tables as structured TenTap nodes before markdown serialization", () => {
		const nextDocument = insertedMarkdownBlock("table");
		expect(nextDocument?.content?.[1]).toMatchObject({
			content: [
				{
					content: [
						{
							content: [
								{
									content: [{ text: "Column", type: "text" }],
									type: "paragraph",
								},
							],
							type: "tableHeader",
						},
						{
							content: [
								{
									content: [{ text: "Value", type: "text" }],
									type: "paragraph",
								},
							],
							type: "tableHeader",
						},
					],
					type: "tableRow",
				},
				{
					content: [
						{
							content: [
								{
									content: [{ text: "Item", type: "text" }],
									type: "paragraph",
								},
							],
							type: "tableCell",
						},
						{
							content: [
								{
									content: [{ text: "Detail", type: "text" }],
									type: "paragraph",
								},
							],
							type: "tableCell",
						},
					],
					type: "tableRow",
				},
			],
			type: "table",
		});
	});

	it("inserts native WYSIWYG whiteboards as desktop durable tldraw markdown", () => {
		const nextDocument = insertedMarkdownBlock("whiteboard");
		expect(tiptapJsonToMobileMarkdown(nextDocument)).toMatch(
			/^Intro\n\n```tldraw id="[^"]+" height="520"\n\{\}\n```\n\nTail$/u,
		);
	});

	it("inserts the wikilink at the current native editor selection", () => {
		expect(
			insertedWikilinkMarkdown({
				text: "Read  today.",
				payload: {
					label: "Mobile UI",
					target: "Tolaria/Mobile UI",
				},
				selection: { from: 6, to: 6 },
			}),
		).toBe("Read [[Tolaria/Mobile UI|Mobile UI]] today.");
	});

	it.each([
		[
			"replaces selected native editor text with the wikilink",
			"Read this note.",
			"Read [[AI Ops Guide]] note.",
		],
		[
			"does not add a rich-editor separator before punctuation",
			"Read this.",
			"Read [[AI Ops Guide]].",
		],
	])("%s", (_name, text, expected) => {
		expect(
			insertedWikilinkMarkdown({
				payload: {
					label: "AI Ops Guide",
					target: "AI Ops Guide",
				},
				selection: { from: 6, to: 10 },
				text,
			}),
		).toBe(expected);
	});

	it("replaces selected native editor text with unformatted clipboard text", () => {
		const nextDocument = nativeWysiwygDocumentWithInsertedPlainText({
			json: documentNode(paragraphNode("Paste rich here.")),
			payload: { text: "Plain\nText" },
			selection: { from: 7, to: 11 },
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(
			"Paste Plain  \nText here.",
		);
	});

	it("falls back to appending to the first paragraph when native selection is unavailable", () => {
		const nextDocument = nativeWysiwygDocumentWithInsertedWikilink({
			json: documentNode(headingNode(1, "Title"), paragraphNode("Body")),
			payload: {
				label: "AI Ops Guide",
				target: "AI Ops Guide",
			},
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(
			["# Title", "", "Body[[AI Ops Guide]]"].join("\n"),
		);
	});

	it("builds TenTap due badge inline content with tolaria://due link mark", () => {
		expect(
			nativeWysiwygDueContent({ date: "2026-11-05", time: "14:30" }),
		).toEqual([
			{ text: " ", type: "text" },
			{
				marks: [
					{
						attrs: {
							class: "tolaria-due-badge",
							href: "tolaria://due?date=2026-11-05&time=14%3A30",
						},
						type: "link",
					},
				],
				text: "2026-11-05 14:30",
				type: "text",
			},
			{ text: " ", type: "text" },
		]);
	});

	it("inserts due badge into selected taskItem and replaces any existing due date and deletes previous emoji icons", () => {
		const doc = documentNode(
			paragraphNode("Intro"),
			taskListNode(
				taskItemNode("Task one"),
				taskItemNode("Task two 📅"),
				taskItemNode("Task three"),
			),
		);

		const nextDocument = nativeWysiwygDocumentWithInsertedDue({
			json: doc,
			payload: { date: "2026-11-05", time: "16:00" },
			selection: { from: 24, to: 24 },
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(
			[
				"Intro",
				"",
				"- [ ] Task one",
				"- [ ] Task two 📅 2026-11-05 ⏰ 16:00",
				"- [ ] Task three",
			].join("\n"),
		);
	});

	it("inserts due badge into selected paragraph and deletes any typed previous emoji icon", () => {
		const doc = documentNode(paragraphNode("Meeting 📅"));

		const nextDocument = nativeWysiwygDocumentWithInsertedDue({
			json: doc,
			payload: { date: "2026-11-05", time: null },
			selection: { from: 11, to: 11 },
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(
			"Meeting 📅 2026-11-05",
		);
	});

	it("inserts due badge into selected taskItem and replaces any existing due date", () => {
		const doc = documentNode(
			paragraphNode("Intro"),
			taskListNode(
				taskItemNode("Task one"),
				taskItemNode("Task two 📅 2026-10-30"),
				taskItemNode("Task three"),
			),
		);

		// Selection inside Task two:
		// doc: 0
		// paragraph: 0..7
		// taskList: 7..
		// Task two is in the middle of taskList
		const nextDocument = nativeWysiwygDocumentWithInsertedDue({
			json: doc,
			payload: { date: "2026-11-05", time: "16:00" },
			selection: { from: 24, to: 24 },
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(
			[
				"Intro",
				"",
				"- [ ] Task one",
				"- [ ] Task two 📅 2026-11-05 ⏰ 16:00",
				"- [ ] Task three",
			].join("\n"),
		);
	});

	it("detects an active native wikilink autocomplete query and replacement range", () => {
		expectAutocomplete("See [[AI", 9, {
			kind: "wikilink",
			query: "AI",
			range: { from: 5, to: 9 },
		});
	});

	it("detects an active native person mention autocomplete query", () => {
		expectAutocomplete("Ask @lu", 8, {
			kind: "personMention",
			query: "lu",
			range: { from: 5, to: 8 },
		});
	});

	it("ignores empty native person mention queries", () => {
		expect(
			nativeWysiwygInlineAutocompleteAtSelection({
				json: documentNode(paragraphNode("Ask @")),
				selection: { from: 6, to: 6 },
			}),
		).toBeNull();
	});

	it("detects an active native emoji shortcode autocomplete query", () => {
		expectAutocomplete("Ship :rock", 11, {
			kind: "emoji",
			query: "rock",
			range: { from: 6, to: 11 },
		});
	});

	it("does not treat slash-prefixed text as native autocomplete", () => {
		expect(
			nativeWysiwygInlineAutocompleteAtSelection({
				json: documentNode(paragraphNode("Insert /table")),
				selection: { from: 14, to: 14 },
			}),
		).toBeNull();
	});

	it("suppresses native autocomplete inside desktop code editing contexts", () => {
		expect(
			nativeWysiwygInlineAutocompleteAtSelection({
				json: documentNode(codeBlockNode("code [[AI")),
				selection: { from: 10, to: 10 },
			}),
		).toBeNull();
		expect(
			nativeWysiwygInlineAutocompleteAtSelection({
				json: documentNode(inlineCodeParagraphNode("code [[AI")),
				selection: { from: 10, to: 10 },
			}),
		).toBeNull();
	});

	it("replaces an active native emoji shortcode query with plain emoji text", () => {
		expect(
			insertedPlainTextMarkdown({
				selection: autocompleteRange("Ship :rock today", 11),
				text: "Ship :rock today",
				value: "🚀",
			}),
		).toBe("Ship 🚀 today");
	});

	it.each([
		{
			cursor: 9,
			expectedMarkdown: "See [[AI Ops Guide]]",
			kind: "wikilink",
			payload: { label: "AI Ops Guide", target: "AI Ops Guide" },
			text: "See [[AI",
		},
		{
			cursor: 8,
			expectedMarkdown: "Ask [[People/Luca|Luca]] about this",
			kind: "person mention",
			payload: { label: "Luca", target: "People/Luca" },
			text: "Ask @Lu about this",
		},
		{
			cursor: 9,
			expectedMarkdown: "See [[AI Ops Guide]], today",
			kind: "wikilink before punctuation",
			payload: { label: "AI Ops Guide", target: "AI Ops Guide" },
			text: "See [[AI, today",
		},
	] as const)(
		"replaces an active native $kind query with the selected wikilink",
		({ cursor, expectedMarkdown, payload, text }) => {
			expect(
				insertedWikilinkMarkdown({
					payload,
					selection: autocompleteRange(text, cursor),
					text,
				}),
			).toBe(expectedMarkdown);
		},
	);
});

function insertedMarkdownBlock(action: NativeWysiwygMarkdownBlockAction) {
	return nativeWysiwygDocumentWithInsertedMarkdownBlock({
		json: documentNode(paragraphNode("Intro"), paragraphNode("Tail")),
		payload: { action },
		selection: { from: 3, to: 3 },
	});
}

function expectAutocomplete(
	text: string,
	cursor: number,
	expected: ReturnType<typeof nativeWysiwygInlineAutocompleteAtSelection>,
): void {
	expect(
		nativeWysiwygInlineAutocompleteAtSelection({
			json: documentNode(paragraphNode(text)),
			selection: { from: cursor, to: cursor },
		}),
	).toEqual(expected);
}

function insertedPlainTextMarkdown({
	selection,
	text,
	value,
}: {
	selection?: NativeWysiwygSelection;
	text: string;
	value: string;
}): string {
	return tiptapJsonToMobileMarkdown(
		nativeWysiwygDocumentWithInsertedPlainText({
			json: documentNode(paragraphNode(text)),
			payload: { text: value },
			selection,
		}),
	);
}

function insertedWikilinkMarkdown({
	payload,
	selection,
	text,
}: {
	payload: NativeWysiwygWikilinkPayload;
	selection?: NativeWysiwygSelection;
	text: string;
}): string {
	return tiptapJsonToMobileMarkdown(
		nativeWysiwygDocumentWithInsertedWikilink({
			json: documentNode(paragraphNode(text)),
			payload,
			selection,
		}),
	);
}

function autocompleteRange(
	text: string,
	cursor: number,
): NativeWysiwygSelection | undefined {
	return nativeWysiwygInlineAutocompleteAtSelection({
		json: documentNode(paragraphNode(text)),
		selection: { from: cursor, to: cursor },
	})?.range;
}

function documentNode(...content: TiptapJsonNode[]): TiptapJsonNode {
	return { content, type: "doc" };
}

function headingNode(level: number, text: string): TiptapJsonNode {
	return {
		attrs: { level },
		content: [{ text, type: "text" }],
		type: "heading",
	};
}

function paragraphNode(text: string): TiptapJsonNode {
	return {
		content: [{ text, type: "text" }],
		type: "paragraph",
	};
}

function codeBlockNode(text: string): TiptapJsonNode {
	return {
		attrs: { language: "text" },
		content: [{ text, type: "text" }],
		type: "codeBlock",
	};
}

function inlineCodeParagraphNode(text: string): TiptapJsonNode {
	return {
		content: [{ marks: [{ type: "code" }], text, type: "text" }],
		type: "paragraph",
	};
}

function taskListNode(...items: TiptapJsonNode[]): TiptapJsonNode {
	return { content: items, type: "taskList" };
}

function taskItemNode(text: string, checked = false): TiptapJsonNode {
	return {
		attrs: { checked },
		content: [paragraphNode(text)],
		type: "taskItem",
	};
}
