import { describe, expect, it } from "vitest";
import {
	type TiptapJsonNode,
	tiptapJsonToMobileMarkdown,
} from "./mobileDocumentContent";
import { nativeWysiwygDocumentWithInputTransforms } from "./mobileWysiwygInputTransforms";

describe("native WYSIWYG input transforms", () => {
	it.each([
		["Flow ->", 8, "Flow →"],
		["Flow <-", 8, "Flow ←"],
		["Flow <->", 9, "Flow ↔"],
		["Flow ←>", 8, "Flow ↔"],
	])(
		"applies desktop arrow ligatures for %s",
		(text, cursor, expectedMarkdown) => {
			const nextDocument = nativeWysiwygDocumentWithInputTransforms({
				json: documentNode(paragraphNode(text)),
				selection: { from: cursor, to: cursor },
			});

			expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(expectedMarkdown);
		},
	);

	it.each([
		["Flow \\->", 9, "Flow ->"],
		["Flow \\<-", 9, "Flow <-"],
		["Flow \\<->", 10, "Flow <->"],
	])(
		"keeps escaped desktop arrow input literal for %s",
		(text, cursor, expectedMarkdown) => {
			const nextDocument = nativeWysiwygDocumentWithInputTransforms({
				json: documentNode(paragraphNode(text)),
				selection: { from: cursor, to: cursor },
			});

			expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(expectedMarkdown);
		},
	);

	it("turns completed desktop highlight syntax into a native mark", () => {
		const nextDocument = nativeWysiwygDocumentWithInputTransforms({
			json: documentNode(paragraphNode("Use ==marked== today.")),
			selection: { from: 15, to: 15 },
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(
			"Use ==marked== today.",
		);
		expect(paragraphMarks(nextDocument)).toContain("highlight");
	});

	it("turns desktop inline math into a native math node after trailing whitespace", () => {
		const nextDocument = nativeWysiwygDocumentWithInputTransforms({
			json: documentNode(paragraphNode("Use $x^2$ today.")),
			selection: { from: 11, to: 11 },
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe("Use $x^2$ today.");
		expect(paragraphNodeTypes(nextDocument)).toContain("mathInline");
	});

	it("turns typed due date syntax into a native due badge mark after trailing whitespace", () => {
		const nextDocument = nativeWysiwygDocumentWithInputTransforms({
			json: documentNode(paragraphNode("Meeting 📅 2026-11-05 ")),
			selection: { from: 23, to: 23 },
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(
			"Meeting 📅 2026-11-05",
		);
		const badgeNode = nextDocument?.content?.[0]?.content?.find((c) =>
			c.marks?.some(
				(m) =>
					m.type === "link" &&
					typeof m.attrs?.href === "string" &&
					m.attrs.href.startsWith("tolaria://due"),
			),
		);
		expect(badgeNode).toBeDefined();
		// The previous calendar emoji is deleted from the badge display text
		expect(badgeNode?.text).toBe("2026-11-05");
	});

	it("turns typed due date with time into a badge without emoji icons", () => {
		const nextDocument = nativeWysiwygDocumentWithInputTransforms({
			json: documentNode(paragraphNode("Meeting 📅 2026-11-05 ⏰ 14:00 ")),
			selection: { from: 31, to: 31 },
		});

		expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(
			"Meeting 📅 2026-11-05 ⏰ 14:00",
		);
		const badgeNode = nextDocument?.content?.[0]?.content?.find((c) =>
			c.marks?.some(
				(m) =>
					m.type === "link" &&
					typeof m.attrs?.href === "string" &&
					m.attrs.href.startsWith("tolaria://due"),
			),
		);
		expect(badgeNode).toBeDefined();
		expect(badgeNode?.text).toBe("2026-11-05 14:00");
	});

	it("waits for trailing whitespace before replacing completed inline math", () => {
		expect(
			nativeWysiwygDocumentWithInputTransforms({
				json: documentNode(paragraphNode("Use $x^2$")),
				selection: { from: 10, to: 10 },
			}),
		).toBeNull();
	});

	it("does not transform financial prose or code-marked inline math", () => {
		expect(
			nativeWysiwygDocumentWithInputTransforms({
				json: documentNode(paragraphNode("Paid $2.5M in ARR$ today.")),
				selection: { from: 23, to: 23 },
			}),
		).toBeNull();

		expect(
			nativeWysiwygDocumentWithInputTransforms({
				json: documentNode(paragraphNode("Use $x^2$ ", [{ type: "code" }])),
				selection: { from: 11, to: 11 },
			}),
		).toBeNull();
	});

	it("does not transform empty, whitespace-padded, or code-marked highlight syntax", () => {
		for (const text of [
			"Use ==== today.",
			"Use == marked== today.",
			"Use ==marked == today.",
		]) {
			expect(
				nativeWysiwygDocumentWithInputTransforms({
					json: documentNode(paragraphNode(text)),
					selection: {
						from: 1 + text.indexOf("== today.") + 2,
						to: 1 + text.indexOf("== today.") + 2,
					},
				}),
			).toBeNull();
		}

		expect(
			nativeWysiwygDocumentWithInputTransforms({
				json: documentNode(paragraphNode("Use ==marked==", [{ type: "code" }])),
				selection: { from: 15, to: 15 },
			}),
		).toBeNull();
	});

	it("does not transform inside code-marked arrow text", () => {
		expect(
			nativeWysiwygDocumentWithInputTransforms({
				json: documentNode(paragraphNode("Flow ->", [{ type: "code" }])),
				selection: { from: 8, to: 8 },
			}),
		).toBeNull();
	});
});

function paragraphMarks(node: TiptapJsonNode | null): string[] {
	return (
		node?.content
			?.flatMap((block) => block.content ?? [])
			.flatMap((inline) => inline.marks ?? [])
			.map((mark) => mark.type ?? "")
			.filter(Boolean) ?? []
	);
}

function paragraphNodeTypes(node: TiptapJsonNode | null): string[] {
	return (
		node?.content
			?.flatMap((block) => block.content ?? [])
			.map((inline) => inline.type ?? "")
			.filter(Boolean) ?? []
	);
}

function documentNode(...content: TiptapJsonNode[]): TiptapJsonNode {
	return { content, type: "doc" };
}

function paragraphNode(
	text: string,
	marks?: TiptapJsonNode["marks"],
): TiptapJsonNode {
	return {
		content: [{ marks, text, type: "text" }],
		type: "paragraph",
	};
}
