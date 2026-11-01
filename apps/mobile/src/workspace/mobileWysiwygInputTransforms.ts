import type { TiptapJsonMark, TiptapJsonNode } from "./mobileDocumentContent";
import { readCompletedMobileInlineMathAtEnd } from "./mobileInlineMath";
import { normalizeDue } from "./mobileTasks";

type NativeWysiwygInputTransformInput = {
	json: unknown;
	selection?: NativeWysiwygSelection;
};

type NativeWysiwygSelection = {
	from: number;
	to: number;
};

type InlineTransform = {
	after: string;
	before: string;
	replacement?: TiptapJsonNode[];
};

type InlineTransformResult = {
	node: TiptapJsonNode;
	transformed: boolean;
};

const highlightMarkType = "highlight";
const mathInlineNodeType = "mathInline";

export function nativeWysiwygDocumentWithInputTransforms({
	json,
	selection,
}: NativeWysiwygInputTransformInput): TiptapJsonNode | null {
	if (!isTiptapDocument(json) || !selection) return null;
	const normalized = normalizedSelection(selection);
	if (normalized.from !== normalized.to) return null;

	const transformed = transformNodeAtSelection(
		withMergedAdjacentTextNodes(json),
		normalized,
	);
	return transformed?.transformed ? transformed.node : null;
}

function transformNodeAtSelection(
	node: TiptapJsonNode,
	selection: NativeWysiwygSelection,
	nodeStart = 0,
): InlineTransformResult | null {
	if (isInlineContainer(node)) {
		return transformInlineContainerAtSelection(node, selection, nodeStart + 1);
	}

	const children = node.content ?? [];
	let childStart = node.type === "doc" ? nodeStart : nodeStart + 1;
	for (const [index, child] of children.entries()) {
		const childEnd = childStart + tiptapNodeSize(child);
		if (selection.from >= childStart && selection.from <= childEnd) {
			const transformed = transformNodeAtSelection(
				child,
				selection,
				childStart,
			);
			if (transformed?.transformed)
				return withReplacedChild(node, index, transformed.node);
		}
		childStart = childEnd;
	}

	return null;
}

function transformInlineContainerAtSelection(
	node: TiptapJsonNode,
	selection: NativeWysiwygSelection,
	contentStart: number,
): InlineTransformResult | null {
	let cursor = contentStart;
	for (const [index, child] of (node.content ?? []).entries()) {
		const childEnd = cursor + tiptapNodeSize(child);
		if (selection.from >= cursor && selection.from <= childEnd) {
			const transformed = transformTextNodeAtSelection(
				child,
				selection.from - cursor,
			);
			if (!transformed) return null;

			return {
				node: {
					...node,
					content: [
						...(node.content ?? []).slice(0, index).map(cloneNode),
						...inlineTransformNodes(transformed),
						...(node.content ?? []).slice(index + 1).map(cloneNode),
					],
				},
				transformed: true,
			};
		}
		cursor = childEnd;
	}

	return null;
}

function transformTextNodeAtSelection(
	node: TiptapJsonNode,
	offset: number,
): InlineTransform | null {
	if (node.type !== "text" || typeof node.text !== "string") return null;
	if (hasCodeMark(node.marks)) return null;

	const before = node.text.slice(0, offset);
	const after = node.text.slice(offset);
	const marks = node.marks?.map(cloneMark) ?? [];

	return completedTextTransform(after, before, marks);
}

function completedTextTransform(
	after: string,
	before: string,
	marks: TiptapJsonMark[],
): InlineTransform | null {
	return (
		completedHighlightTransform({ after, before, marks }) ??
		completedInlineMathTransform({ after, before }) ??
		arrowLigatureTransform({ after, before }) ??
		completedDueBadgeTransform({ after, before })
	);
}

function completedDueBadgeTransform({
	after,
	before,
}: Pick<InlineTransform, "after" | "before">): InlineTransform | null {
	const trailingWhitespace = before.match(/[^\S\r\n]$/u)?.[0] ?? "";
	if (!trailingWhitespace) return null;

	const candidate = before.slice(0, -trailingWhitespace.length);
	const match =
		/(?:^|\s)((?:📅|🗓️)\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})(?:\s*(?:⏰|\bum\s*|\bat\s*)?\s*([01]?\d:[0-5]\d|2[0-3]:[0-5]\d))?)$/u.exec(
			candidate,
		);
	if (!match) return null;

	const fullMatch = match[1];
	const rawDate = match[2];
	const rawTime = match[3];
	const date = normalizeDue(rawDate);
	if (!date) return null;

	const time = rawTime ? rawTime.trim() : null;
	const matchStart = candidate.length - fullMatch.length;
	const href = `tolaria://due?date=${date}${time ? `&time=${encodeURIComponent(time)}` : ""}`;
	const rawText = time ? `${date} ${time}` : `${date}`;

	const badgeNode: TiptapJsonNode = {
		marks: [{ attrs: { class: "tolaria-due-badge", href }, type: "link" }],
		text: rawText,
		type: "text",
	};

	return {
		after,
		before: before.slice(0, matchStart),
		replacement: [
			badgeNode,
			...(trailingWhitespace
				? [{ text: trailingWhitespace, type: "text" }]
				: []),
		],
	};
}

function arrowLigatureTransform({
	after,
	before,
}: Pick<InlineTransform, "after" | "before">): InlineTransform | null {
	const change = arrowLigatureChange(before);
	if (!change) return null;

	return {
		after,
		before: `${before.slice(0, -change.remove)}${change.insert}`,
	};
}

function arrowLigatureChange(
	before: string,
): { insert: string; remove: number } | null {
	if (before.endsWith("\\<->")) return { insert: "<->", remove: 4 };
	if (before.endsWith("\\->")) return { insert: "->", remove: 3 };
	if (before.endsWith("\\<-")) return { insert: "<-", remove: 3 };
	if (before.endsWith("<->")) return { insert: "↔", remove: 3 };
	if (before.endsWith("←>")) return { insert: "↔", remove: 2 };
	if (before.endsWith("->")) return { insert: "→", remove: 2 };
	if (before.endsWith("<-")) return { insert: "←", remove: 2 };

	return null;
}

function completedHighlightTransform({
	after,
	before,
	marks,
}: Pick<InlineTransform, "after" | "before"> & {
	marks: TiptapJsonMark[];
}): InlineTransform | null {
	if (!before.endsWith("==")) return null;

	const closingStart = before.length - 2;
	const openingStart = before.lastIndexOf("==", closingStart - 1);
	if (openingStart === -1) return null;

	const contentStart = openingStart + 2;
	const content = before.slice(contentStart, closingStart);
	if (!validHighlightContent(content)) return null;

	return {
		after,
		before: before.slice(0, openingStart),
		replacement: [textNode(content, withHighlightMark(marks))].filter(
			isTiptapJsonNode,
		),
	};
}

function completedInlineMathTransform({
	after,
	before,
}: Pick<InlineTransform, "after" | "before">): InlineTransform | null {
	const trailingWhitespace = before.match(/[^\S\r\n]$/u)?.[0] ?? "";
	if (!trailingWhitespace) return null;

	const candidate = before.slice(0, -trailingWhitespace.length);
	const math = readCompletedMobileInlineMathAtEnd({ text: candidate });
	if (!math) return null;

	return {
		after: `${trailingWhitespace}${after}`,
		before: candidate.slice(0, math.start),
		replacement: [mathInlineNode(math.latex)],
	};
}

function validHighlightContent(content: string): boolean {
	if (content.trim().length === 0) return false;
	if (/^\s|\s$/u.test(content)) return false;
	return !/[\r\n]/u.test(content);
}

function inlineTransformNodes(transform: InlineTransform): TiptapJsonNode[] {
	return [
		textNode(transform.before),
		...(transform.replacement ?? []),
		textNode(transform.after),
	].filter((node): node is TiptapJsonNode => node !== null);
}

function mathInlineNode(latex: string): TiptapJsonNode {
	return {
		attrs: { latex },
		type: mathInlineNodeType,
	};
}

function textNode(
	text: string,
	marks?: TiptapJsonMark[],
): TiptapJsonNode | null {
	if (!text) return null;
	return marks && marks.length > 0
		? { marks: marks.map(cloneMark), text, type: "text" }
		: { text, type: "text" };
}

function withHighlightMark(marks: TiptapJsonMark[]): TiptapJsonMark[] {
	return marks.some((mark) => mark.type === highlightMarkType)
		? marks.map(cloneMark)
		: [...marks.map(cloneMark), { type: highlightMarkType }];
}

function hasCodeMark(marks: TiptapJsonMark[] | undefined): boolean {
	return Boolean(marks?.some((mark) => mark.type === "code"));
}

function withReplacedChild(
	node: TiptapJsonNode,
	index: number,
	child: TiptapJsonNode,
): InlineTransformResult {
	return {
		node: {
			...cloneNode(node),
			content: (node.content ?? []).map((candidate, candidateIndex) =>
				candidateIndex === index ? child : cloneNode(candidate),
			),
		},
		transformed: true,
	};
}

function normalizedSelection(
	selection: NativeWysiwygSelection,
): NativeWysiwygSelection {
	return {
		from: Math.max(0, Math.min(selection.from, selection.to)),
		to: Math.max(0, Math.max(selection.from, selection.to)),
	};
}

function isInlineContainer(node: TiptapJsonNode): boolean {
	return node.type === "paragraph" || node.type === "heading";
}

function isTiptapDocument(value: unknown): value is TiptapJsonNode {
	return Boolean(
		value &&
			typeof value === "object" &&
			(value as TiptapJsonNode).type === "doc",
	);
}

function isTiptapJsonNode(value: unknown): value is TiptapJsonNode {
	return Boolean(
		value &&
			typeof value === "object" &&
			typeof (value as TiptapJsonNode).type === "string",
	);
}

function tiptapNodeSize(node: TiptapJsonNode): number {
	if (typeof node.text === "string") return node.text.length;
	if (!node.content) return 1;

	return node.content.reduce((size, child) => size + tiptapNodeSize(child), 2);
}

function cloneMark(mark: TiptapJsonMark): TiptapJsonMark {
	return {
		...mark,
		attrs: mark.attrs ? { ...mark.attrs } : undefined,
	};
}

function cloneNode(node: TiptapJsonNode): TiptapJsonNode {
	return {
		...node,
		attrs: node.attrs ? { ...node.attrs } : undefined,
		content: node.content?.map(cloneNode),
		marks: node.marks?.map(cloneMark),
	};
}

function withMergedAdjacentTextNodes(node: TiptapJsonNode): TiptapJsonNode {
	if (!node.content) return cloneNode(node);

	const content: TiptapJsonNode[] = [];
	for (const child of node.content) {
		appendMergedChild(content, withMergedAdjacentTextNodes(child));
	}

	return {
		...cloneNode(node),
		content,
	};
}

function appendMergedChild(
	content: TiptapJsonNode[],
	child: TiptapJsonNode,
): void {
	const previous = content.at(-1);
	if (!previous || !canMergeTextNodes(previous, child)) {
		content.push(child);
		return;
	}

	content[content.length - 1] = {
		...previous,
		text: `${previous.text ?? ""}${child.text ?? ""}`,
	};
}

function canMergeTextNodes(
	left: TiptapJsonNode,
	right: TiptapJsonNode,
): boolean {
	return (
		left.type === "text" &&
		right.type === "text" &&
		typeof left.text === "string" &&
		typeof right.text === "string" &&
		marksEqual(left.marks, right.marks)
	);
}

function marksEqual(
	left: TiptapJsonMark[] | undefined,
	right: TiptapJsonMark[] | undefined,
): boolean {
	const leftMarks = left ?? [];
	const rightMarks = right ?? [];
	if (leftMarks.length !== rightMarks.length) return false;

	return leftMarks.every((mark, index) => markEqual(mark, rightMarks[index]));
}

function markEqual(
	left: TiptapJsonMark,
	right: TiptapJsonMark | undefined,
): boolean {
	if (!right) return false;

	return left.type === right.type && attributesEqual(left.attrs, right.attrs);
}

function attributesEqual(
	left: Record<string, unknown> | undefined,
	right: Record<string, unknown> | undefined,
): boolean {
	const leftAttributes = Object.entries(left ?? {});
	const rightAttributes = Object.entries(right ?? {});
	if (leftAttributes.length !== rightAttributes.length) return false;

	return leftAttributes.every(([key, value]) => Object.is(value, right?.[key]));
}
