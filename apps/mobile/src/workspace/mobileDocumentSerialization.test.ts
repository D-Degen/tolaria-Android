import { describe, expect, it } from "vitest";
import {
	mobileMarkdownBodyToTentapHtml,
	type TiptapJsonNode,
	tiptapJsonToMobileMarkdown,
} from "./mobileDocumentContent";

describe("mobile document content", () => {
	it("serializes TenTap JSON back to Tolaria markdown", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					attrs: { level: 1 },
					type: "heading",
					content: [{ text: "Workflow Orchestration Essay", type: "text" }],
				},
				{
					type: "paragraph",
					content: [
						{ text: "Keep ", type: "text" },
						{ marks: [{ type: "bold" }], text: "relationships", type: "text" },
						{ text: " visible with ", type: "text" },
						{
							marks: [{ type: "highlight" }],
							text: "highlighted context",
							type: "text",
						},
						{ text: " and ", type: "text" },
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
						{ text: ".", type: "text" },
					],
				},
				{
					type: "bulletList",
					content: [
						{
							type: "listItem",
							content: [
								{
									type: "paragraph",
									content: [{ text: "Copy desktop first", type: "text" }],
								},
							],
						},
					],
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			[
				"# Workflow Orchestration Essay",
				"",
				"Keep **relationships** visible with ==highlighted context== and [[Tolaria/Mobile UI|Mobile UI]].",
				"",
				"- Copy desktop first",
			].join("\n"),
		);
	});

	it("serializes task lists and tables from TenTap JSON", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					type: "taskList",
					content: [
						{
							attrs: { checked: true },
							type: "taskItem",
							content: [
								{
									type: "paragraph",
									content: [{ text: "Done", type: "text" }],
								},
							],
						},
						{
							attrs: { checked: false },
							type: "taskItem",
							content: [
								{
									type: "paragraph",
									content: [{ text: "Next", type: "text" }],
								},
							],
						},
					],
				},
				{
					type: "table",
					content: [
						{
							type: "tableRow",
							content: [
								{
									type: "tableHeader",
									content: [{ text: "Surface", type: "text" }],
								},
								{
									type: "tableHeader",
									content: [{ text: "Target", type: "text" }],
								},
							],
						},
						{
							type: "tableRow",
							content: [
								{
									type: "tableCell",
									content: [{ text: "Editor", type: "text" }],
								},
								{
									type: "tableCell",
									content: [{ text: "WYSIWYG", type: "text" }],
								},
							],
						},
					],
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			[
				"- [x] Done",
				"- [ ] Next",
				"",
				"| Surface | Target |",
				"| --- | --- |",
				"| Editor | WYSIWYG |",
			].join("\n"),
		);
	});

	it("serializes aligned TenTap table cells back to desktop markdown divider syntax", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					type: "table",
					content: [
						{
							type: "tableRow",
							content: [
								{
									attrs: { align: "left" },
									type: "tableHeader",
									content: [{ text: "Surface", type: "text" }],
								},
								{
									attrs: { tolariaAlignment: "center" },
									type: "tableHeader",
									content: [{ text: "Desktop", type: "text" }],
								},
								{
									attrs: { align: "right" },
									type: "tableHeader",
									content: [{ text: "Mobile", type: "text" }],
								},
							],
						},
						{
							type: "tableRow",
							content: [
								{
									attrs: { tolariaAlignment: "left" },
									type: "tableCell",
									content: [{ text: "Editor", type: "text" }],
								},
								{
									attrs: { tolariaAlignment: "center" },
									type: "tableCell",
									content: [{ text: "BlockNote", type: "text" }],
								},
								{
									attrs: { tolariaAlignment: "right" },
									type: "tableCell",
									content: [{ text: "TenTap", type: "text" }],
								},
							],
						},
					],
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			[
				"| Surface | Desktop | Mobile |",
				"| :--- | :---: | ---: |",
				"| Editor | BlockNote | TenTap |",
			].join("\n"),
		);
	});

	it("serializes tolaria://due links back to Obsidian Tasks due and time markers", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{ text: "Task due ", type: "text" },
						{
							marks: [
								{
									attrs: { href: "tolaria://due?date=2026-11-05&time=14:30" },
									type: "link",
								},
							],
							text: "2026-11-05 14:30",
							type: "text",
						},
					],
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"Task due 📅 2026-11-05 ⏰ 14:30",
		);
	});

	it("keeps source-fallback code fences from native TenTap paragraphs as editable markdown lines", () => {
		expect(
			tiptapJsonToMobileMarkdown(
				paragraphDocument(
					"```ts",
					'const parity = "desktop";',
					"ship(parity)",
					"```",
				),
			),
		).toBe(
			["```ts", 'const parity = "desktop";', "ship(parity)", "```"].join("\n"),
		);
	});

	it("serializes native codeBlock nodes back to desktop fenced markdown", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					attrs: { language: "ts" },
					content: [{ text: 'const parity = "desktop"', type: "text" }],
					type: "codeBlock",
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			'```ts\nconst parity = "desktop"\n```',
		);
	});

	it("serializes native codeBlock nodes with longer fences when code contains backticks", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					attrs: { language: "md" },
					content: [{ text: "```ts\nconst nested = true\n```", type: "text" }],
					type: "codeBlock",
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"````md\n```ts\nconst nested = true\n```\n````",
		);
	});

	it("serializes plain TenTap wikilinks without redundant display aliases", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{ text: "See ", type: "text" },
						{
							marks: [
								{
									attrs: { href: "tolaria://wikilink/Project%20Alpha" },
									type: "link",
								},
							],
							text: "Project Alpha",
							type: "text",
						},
						{ text: " and ", type: "text" },
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
						{ text: ".", type: "text" },
					],
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"See [[Project Alpha]] and [[Tolaria/Mobile UI|Mobile UI]].",
		);
	});

	it("serializes link destinations with spaces using desktop angle syntax", () => {
		expect(
			tiptapJsonToMobileMarkdown(linkDocument("attachments/project brief.pdf")),
		).toBe("[project brief.pdf](<attachments/project brief.pdf>)");
	});

	it("serializes link labels with brackets as escaped desktop markdown labels", () => {
		expect(
			tiptapJsonToMobileMarkdown(
				linkDocument("https://example.com/alpha", "Project [Alpha]"),
			),
		).toBe("[Project \\[Alpha\\]](https://example.com/alpha)");
	});

	it("serializes link destinations with parentheses as escaped desktop markdown destinations", () => {
		const markdown = tiptapJsonToMobileMarkdown(
			linkDocument("https://cdn.example.com/Workflow%20Plan%20(1).pdf", "spec"),
		);

		expect(markdown).toBe(
			"[spec](https://cdn.example.com/Workflow%20Plan%20\\(1\\).pdf)",
		);
		expect(mobileMarkdownBodyToTentapHtml(`${markdown}\n`)).toBe(
			'<p><a href="https://cdn.example.com/Workflow%20Plan%20(1).pdf">spec</a></p>',
		);
	});

	it("serializes native attachment link URIs back to portable markdown destinations", () => {
		expect(
			tiptapJsonToMobileMarkdown(
				linkDocument("file:///vault/root/attachments/project%20brief.pdf"),
				{ vaultRootUri: "file:///vault/root/" },
			),
		).toBe("[project brief.pdf](<attachments/project brief.pdf>)");
	});

	it("serializes url and email autolinks back to durable markdown autolink syntax", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{ text: "Location: ", type: "text" },
						{
							marks: [
								{
									attrs: { href: "https://example.com/room?id=42" },
									type: "link",
								},
							],
							text: "https://example.com/room?id=42",
							type: "text",
						},
						{ text: " and ", type: "text" },
						{
							marks: [
								{ attrs: { href: "mailto:luca@example.com" }, type: "link" },
							],
							text: "luca@example.com",
							type: "text",
						},
					],
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"Location: <https://example.com/room?id=42> and <luca@example.com>",
		);
	});

	it("escapes literal inline markdown punctuation when serializing plain text", () => {
		const document = paragraphDocument("Keep (No highlights) and ¯_(ツ)_/¯");

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"Keep (No highlights) and ¯\\_(ツ)\\_/¯",
		);
	});

	it("serializes display math hard breaks back to durable markdown source", () => {
		const document = paragraphDocument("$$", "\\int_0^1 x\\,dx", "$$");

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"$$\n\\int_0^1 x\\,dx\n$$",
		);
	});

	it("serializes native display math nodes back to desktop markdown source", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					attrs: { latex: "\\int_0^1 x\\,dx" },
					type: "mathBlock",
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"$$\n\\int_0^1 x\\,dx\n$$",
		);
	});

	it("serializes native inline math nodes back to desktop markdown source", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{ text: "Use ", type: "text" },
						{ attrs: { latex: "x^2" }, type: "mathInline" },
						{ text: " today.", type: "text" },
					],
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe("Use $x^2$ today.");
	});

	it("keeps code-indented display math paragraphs as editable markdown source after native saves", () => {
		const document = paragraphDocument("    $$", "    x^2", "    $$");

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"    $$\n    x^2\n    $$",
		);
	});

	it("keeps indented fenced code paragraphs as editable markdown source after native saves", () => {
		const document = paragraphDocument("  ```ts", "  const x = 1", "  ```");

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"  ```ts\n  const x = 1\n  ```",
		);
	});

	it("keeps root indented text paragraphs as editable markdown source after native saves", () => {
		const document = paragraphDocument(
			"    Teach your AI agent the workflow context.",
			"    Then run the task.",
		);

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"    Teach your AI agent the workflow context.\n    Then run the task.",
		);
	});

	it("keeps non-math TenTap hard breaks as markdown hard break markers", () => {
		const document = paragraphDocument("Line one", "Line two");

		expect(tiptapJsonToMobileMarkdown(document)).toBe("Line one  \nLine two");
	});

	it("keeps unsupported table paragraphs as editable markdown table lines after native saves", () => {
		const document = paragraphDocument(
			"| Surface | Target |",
			"| --- | --- |",
			"| Editor | WYSIWYG |",
		);

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			["| Surface | Target |", "| --- | --- |", "| Editor | WYSIWYG |"].join(
				"\n",
			),
		);
	});

	it("keeps unsupported details paragraphs as editable markdown source after native saves", () => {
		const document = paragraphDocument(
			"<details><summary>Manufacturing</summary>",
			"",
			"Made in Italy",
			"",
			"</details>",
		);

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			[
				"<details><summary>Manufacturing</summary>",
				"",
				"Made in Italy",
				"",
				"</details>",
			].join("\n"),
		);
	});

	it("keeps unsupported html comment paragraphs as editable markdown source after native saves", () => {
		const document = paragraphDocument("<!--", '{"fold":true}', "-->");

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			["<!--", '{"fold":true}', "-->"].join("\n"),
		);
	});

	it("keeps code-indented list paragraphs as editable markdown source after native saves", () => {
		const document = paragraphDocument(
			"    1. Contextualize: Dump TOC into an LLM.",
			"    2. Summarize major sections.",
		);

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			[
				"    1. Contextualize: Dump TOC into an LLM.",
				"    2. Summarize major sections.",
			].join("\n"),
		);
	});

	it("serializes blockquote paragraphs with quoted hard breaks and blank quote separators", () => {
		const document: TiptapJsonNode = {
			type: "doc",
			content: [
				{
					type: "blockquote",
					content: [
						paragraphNode("First quote line", "Second line"),
						paragraphNode("Follow-up paragraph"),
					],
				},
			],
		};

		expect(tiptapJsonToMobileMarkdown(document)).toBe(
			"> First quote line  \n> Second line\n> \n> Follow-up paragraph",
		);
	});

	it("serializes TenTap image nodes back to portable markdown images", () => {
		expect(
			tiptapJsonToMobileMarkdown(
				imageDocument({
					alt: "Architecture diagram",
					src: "attachments/mobile diagram.png",
				}),
			),
		).toBe("![Architecture diagram](<attachments/mobile diagram.png>)");
	});

	it("serializes native attachment image URIs back to portable markdown images", () => {
		expect(
			tiptapJsonToMobileMarkdown(
				imageDocument({
					alt: "Architecture diagram",
					src: "file:///vault/root/attachments/mobile%20diagram.png",
				}),
				{ vaultRootUri: "file:///vault/root/" },
			),
		).toBe("![Architecture diagram](<attachments/mobile diagram.png>)");
	});

	it("serializes TenTap image titles back to desktop markdown image titles", () => {
		expect(
			tiptapJsonToMobileMarkdown(
				imageDocument({
					alt: "shot",
					src: "attachments/file.png",
					title: "starter vault",
				}),
			),
		).toBe('![shot](attachments/file.png "starter vault")');
	});

	it("serializes image URLs with closing parentheses as escaped markdown destinations", () => {
		expect(
			tiptapJsonToMobileMarkdown(
				imageDocument({
					alt: "",
					src: "https://cdn.example.com/Opengraph%20-%20Home%20Page%20(1).jpg",
				}),
			),
		).toBe(
			"![](https://cdn.example.com/Opengraph%20-%20Home%20Page%20\\(1\\).jpg)",
		);
	});
});

function paragraphDocument(...lines: string[]): TiptapJsonNode {
	return { type: "doc", content: [paragraphNode(...lines)] };
}

function linkDocument(
	href: string,
	text = "project brief.pdf",
): TiptapJsonNode {
	return {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [
					{
						marks: [{ attrs: { href }, type: "link" }],
						text,
						type: "text",
					},
				],
			},
		],
	};
}

function imageDocument(attrs: Record<string, string>): TiptapJsonNode {
	return {
		type: "doc",
		content: [
			{
				attrs,
				type: "image",
			},
		],
	};
}

function paragraphNode(...lines: string[]): TiptapJsonNode {
	return {
		type: "paragraph",
		content: lines.flatMap((line, index): TiptapJsonNode[] => [
			...(index > 0 ? [{ type: "hardBreak" }] : []),
			...(line ? [{ text: line, type: "text" }] : []),
		]),
	};
}
