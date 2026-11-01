import { describe, expect, it } from "vitest";
import {
	deriveLocalVaultTitle,
	localVaultEditorBlocks,
	localVaultEditorBullets,
	localVaultLinkCount,
	localVaultOutgoingLinks,
	localVaultSnippet,
} from "./localVaultMarkdown";

const desktopMarkdownFixture = [
	"# Mobile Parity",
	"",
	"## Section",
	"#### Detail",
	"",
	"1. First step with [source](https://example.com)",
	"  1. Nested step",
	"",
	"- [x] Done ~~removed~~",
	"- [ ] Pending **bold**",
	"",
	"> Quote with **weight**",
	"> and a second line.",
	"",
	"```plain text",
	"const ok = true",
	"```",
	"",
	"---",
	"",
	"Paragraph with ***bold italic*** and [[Target Note|display text]].",
].join("\n");

const expectedDesktopBlocks = [
	{ kind: "heading", level: 2, text: "Section" },
	{ kind: "heading", level: 4, text: "Detail" },
	{
		kind: "orderedList",
		items: [
			{
				content: [
					{ text: "First step with " },
					{ linkHref: "https://example.com", text: "source" },
				],
				depth: 0,
				marker: "1.",
			},
			{
				content: [{ text: "Nested step" }],
				depth: 1,
				marker: "1.",
			},
		],
	},
	{
		kind: "tasks",
		items: [
			{
				checked: true,
				content: [{ text: "Done " }, { strike: true, text: "removed" }],
			},
			{
				checked: false,
				content: [{ text: "Pending " }, { bold: true, text: "bold" }],
			},
		],
	},
	{
		content: [
			{ text: "Quote with " },
			{ bold: true, text: "weight" },
			{ text: " and a second line." },
		],
		kind: "quote",
	},
	{ code: "const ok = true", kind: "codeBlock", language: "plain text" },
	{ kind: "divider" },
	{
		content: [
			{ text: "Paragraph with " },
			{ bold: true, italic: true, text: "bold italic" },
			{ text: " and " },
			{ text: "display text", wikilinkTarget: "Target Note" },
			{ text: "." },
		],
		kind: "paragraph",
	},
];

describe("localVaultMarkdown", () => {
	it("parses desktop markdown blocks used by Tolaria notes", () => {
		expect(localVaultEditorBlocks(desktopMarkdownFixture)).toMatchObject(
			expectedDesktopBlocks,
		);
	});

	it("derives mobile titles, snippets, and fallback bullet text from markdown", () => {
		const body = [
			"# Visible Title",
			"",
			"- First **item**",
			"  - Nested [[Target]]",
			"",
			"Paragraph with `code`.",
		].join("\n");

		const blocks = localVaultEditorBlocks(body);

		expect(
			deriveLocalVaultTitle({
				body,
				fallbackTitle: null,
				filename: "fallback-title.md",
			}),
		).toBe("Visible Title");
		expect(localVaultSnippet(body)).toBe("First item");
		expect(localVaultEditorBullets(blocks)).toEqual([
			"First item",
			"Nested Target",
		]);
	});

	it("does not render blank initial title placeholders as empty paragraphs", () => {
		expect(localVaultEditorBlocks(["# ", "", ""].join("\n"))).toEqual([]);
	});

	it("extracts desktop body wikilink targets while ignoring fenced code", () => {
		const body = [
			"Body with [[Target Note|display]] and [[Folder/Other Note]].",
			"",
			"```md",
			"Ignored [[Code Link]].",
			"```",
			"",
			"Repeated [[Target Note]].",
		].join("\n");

		expect(localVaultOutgoingLinks(body)).toEqual([
			"Folder/Other Note",
			"Target Note",
		]);
		expect(localVaultLinkCount(body)).toBe(2);
	});

	it("parses inline due date and time markers into due objects", () => {
		const body =
			"- [ ] Aufgabe mit Termin 📅 2026-11-05 ⏰ 14:30\n- [ ] Ohne Zeit 📅 2026-12-01";
		const blocks = localVaultEditorBlocks(body);
		expect(blocks).toMatchObject([
			{
				kind: "tasks",
				items: [
					{
						checked: false,
						content: [
							{ text: "Aufgabe mit Termin " },
							{
								due: { date: "2026-11-05", time: "14:30" },
								text: "📅 2026-11-05 ⏰ 14:30",
							},
						],
					},
					{
						checked: false,
						content: [
							{ text: "Ohne Zeit " },
							{
								due: { date: "2026-12-01" },
								text: "📅 2026-12-01",
							},
						],
					},
				],
			},
		]);
	});
});
