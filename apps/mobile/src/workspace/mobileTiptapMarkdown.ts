import { mobilePortableAttachmentHref } from "./mobileAttachmentUris";
import { normalizeMobileDisplayMathMarkdown } from "./mobileDisplayMath";
import type {
	CodeFenceSourceMode,
	LinkLabel,
	ListKind,
	MarkdownBody,
	MarkdownLine,
	MarkdownLines,
	MarkdownNormalizer,
	PlainText,
	SerializeInlineOptions,
	TiptapJsonMark,
	TiptapJsonNode,
	TiptapMarkdownOptions,
	UrlText,
} from "./mobileDocumentContent.types";
import {
	isMobileMarkdownCodeFenceClose,
	mobileMarkdownFenceForContent,
	readMobileMarkdownCodeFence,
} from "./mobileMarkdownCodeFence";
import { readListSourceLines } from "./mobileMarkdownHtmlBlocks";
import { mobileImageNodeMarkdown } from "./mobileMarkdownImage";
import {
	hasLeadingWhitespace,
	indentLines,
	isIndentedListSourceLine,
	isIndentedTextSourceLine,
	isIrregularOrderedDotListSource,
	isMarkdownTableDivider,
	isOrderedParenListSourceLine,
	prefixLines,
} from "./mobileMarkdownSourceLines";
import {
	type MobileMarkdownTableAlignment,
	mobileMarkdownTableSource,
} from "./mobileMarkdownTables";
import { normalizeUnsupportedHtmlBlockMarkdown } from "./mobileUnsupportedHtmlMarkdown";

export const WIKILINK_HREF_PREFIX = "tolaria://wikilink/";

export function tiptapJsonToMobileMarkdown(
	node: unknown,
	options: TiptapMarkdownOptions = {},
): MarkdownBody {
	if (!isTiptapJsonNode(node)) return "";
	return serializeBlockChildren(node.content ?? [], options).trimEnd();
}

export function serializeBlockChildren(
	nodes: TiptapJsonNode[],
	options: TiptapMarkdownOptions,
): MarkdownBody {
	return nodes
		.map((node) => serializeBlockNode(node, options))
		.filter((block) => block.length > 0)
		.join("\n\n");
}

export function serializeBlockNode(
	node: TiptapJsonNode,
	options: TiptapMarkdownOptions,
): MarkdownBody {
	const serializer = node.type ? blockNodeSerializers[node.type] : undefined;
	return serializer
		? serializer(node, options)
		: serializeBlockChildren(node.content ?? [], options);
}

export const blockNodeSerializers: Record<
	string,
	(node: TiptapJsonNode, options: TiptapMarkdownOptions) => MarkdownBody
> = {
	paragraph: serializeParagraph,
	heading: (node, options) =>
		`${"#".repeat(headingLevel(node))} ${serializeInlineChildren(node.content ?? [], options)}`.trimEnd(),
	bulletList: (node, options) => serializeList(node, "bullet", options),
	orderedList: (node, options) => serializeList(node, "ordered", options),
	taskList: (node, options) => serializeList(node, "task", options),
	blockquote: (node, options) =>
		prefixLines(serializeBlockChildren(node.content ?? [], options), "> "),
	codeBlock: codeBlockMarkdown,
	mobileDiagram: (node) =>
		typeof node.attrs?.source === "string" ? node.attrs.source : "",
	horizontalRule: () => "---",
	image: imageMarkdown,
	mathBlock: displayMathMarkdown,
	table: tableMarkdown,
};

export function serializeParagraph(
	node: TiptapJsonNode,
	options: TiptapMarkdownOptions,
): MarkdownBody {
	const rawMarkdown = serializeInlineChildren(node.content ?? [], options);
	const normalizedMarkdown =
		normalizeMobileFallbackParagraphMarkdown(rawMarkdown);
	return normalizedMarkdown !== rawMarkdown ||
		hasInlineMarkdownImageSource(rawMarkdown)
		? normalizedMarkdown
		: serializeInlineChildren(node.content ?? [], {
				...options,
				escapePlainText: true,
			});
}

export function normalizeMobileFallbackParagraphMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	for (const normalize of mobileFallbackParagraphNormalizers) {
		const normalizedMarkdown = normalize(markdown);
		if (normalizedMarkdown !== markdown) return normalizedMarkdown;
	}

	return markdown;
}

export const mobileFallbackParagraphNormalizers: MarkdownNormalizer[] = [
	normalizeMobileDisplayMathMarkdown,
	normalizeInlineImageSourceMarkdown,
	normalizeHorizontalRuleSourceMarkdown,
	normalizeCodeFenceSourceMarkdown,
	normalizeUnsupportedHtmlBlockMarkdown,
	normalizeIndentedCodeFenceSourceMarkdown,
	normalizeIndentedListSourceMarkdown,
	normalizeListContinuationSourceMarkdown,
	normalizeListHardBreakSourceMarkdown,
	normalizeOrderedParenListSourceMarkdown,
	normalizeIrregularOrderedDotListSourceMarkdown,
	normalizeIndentedTextSourceMarkdown,
	normalizeUnsupportedTableMarkdown,
];

export function normalizeInlineImageSourceMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	return lines.some(hasInlineMarkdownImageSource) ? lines.join("\n") : markdown;
}

export function normalizeHorizontalRuleSourceMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	if (lines.length !== 1) return markdown;

	const line = lines[0] ?? "";
	return line.trim() === "---" ? line : markdown;
}

export function hasInlineMarkdownImageSource(markdown: MarkdownBody): boolean {
	return /(^|[^\\])!\[(?:\\.|[^\]\\\n])*\]\(/u.test(markdown);
}

export function normalizeCodeFenceSourceMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	if (!isCodeFenceSourceParagraph(lines, "root")) return markdown;

	return lines.join("\n");
}

export function isCodeFenceSourceParagraph(
	lines: MarkdownLines,
	mode: CodeFenceSourceMode,
): boolean {
	const firstLine = lines[0] ?? "";
	if (hasLeadingWhitespace(firstLine) !== (mode === "indented")) return false;

	const opening = readMobileMarkdownCodeFence(firstLine);
	if (!opening || lines.length < 2) return false;
	return isMobileMarkdownCodeFenceClose(lines[lines.length - 1] ?? "", opening);
}

export function normalizeIndentedCodeFenceSourceMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	if (!isCodeFenceSourceParagraph(lines, "indented")) return markdown;

	return lines.join("\n");
}

export function normalizeIndentedListSourceMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	if (!lines.every(isIndentedListSourceLine)) return markdown;

	return lines.join("\n");
}

export function normalizeListContinuationSourceMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	const source = readListSourceLines(lines, 0);
	if (!source?.hasContinuation || source.nextIndex !== lines.length)
		return markdown;

	return source.lines.join("\n");
}

export function normalizeListHardBreakSourceMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	const source = readListSourceLines(lines, 0);
	if (!source?.hasHardBreak || source.nextIndex !== lines.length)
		return markdown;

	return source.lines.join("\n");
}

export function normalizeOrderedParenListSourceMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	if (!lines.every(isOrderedParenListSourceLine)) return markdown;

	return lines.join("\n");
}

export function normalizeIrregularOrderedDotListSourceMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	if (!isIrregularOrderedDotListSource(lines)) return markdown;

	return lines.join("\n");
}

export function normalizeIndentedTextSourceMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	if (!lines.every(isIndentedTextSourceLine)) return markdown;

	return lines.join("\n");
}

export function normalizeUnsupportedTableMarkdown(
	markdown: MarkdownBody,
): MarkdownBody {
	const lines = markdown.split("\n").map(stripHardBreakMarker);
	if (!isUnsupportedTableParagraph(lines)) return markdown;

	return lines.join("\n");
}

export function isUnsupportedTableParagraph(lines: MarkdownLines): boolean {
	const header = lines[0] ?? "";
	const divider = lines[1] ?? "";
	return (
		lines.length >= 2 &&
		lines.every(isMarkdownTableLine) &&
		header.includes("|") &&
		isMarkdownTableDivider(divider)
	);
}

export function isMarkdownTableLine(line: MarkdownLine): boolean {
	return line.includes("|");
}

export function stripHardBreakMarker(line: MarkdownLine): MarkdownLine {
	return line.endsWith("  ") ? line.slice(0, -2) : line;
}

export function serializeInlineChildren(
	nodes: TiptapJsonNode[],
	options: SerializeInlineOptions,
): string {
	return nodes.map((node) => serializeInlineNode(node, options)).join("");
}

export function serializeInlineNode(
	node: TiptapJsonNode,
	options: SerializeInlineOptions,
): string {
	if (node.type === "text") return serializeTextNode(node, options);
	if (node.type === "hardBreak") return "  \n";
	if (node.type === "image") return imageMarkdown(node, options);
	if (node.type === "mathInline") return inlineMathMarkdown(node);
	return serializeInlineChildren(node.content ?? [], options);
}

export function inlineMathMarkdown(node: TiptapJsonNode): MarkdownBody {
	const latex =
		typeof node.attrs?.latex === "string"
			? node.attrs.latex
			: typeof node.props?.latex === "string"
				? node.props.latex
				: "";
	return `$${latex}$`;
}

export function serializeTextNode(
	node: TiptapJsonNode,
	options: SerializeInlineOptions,
): string {
	const text = node.text ?? "";
	const marks = node.marks ?? [];
	return options?.escapePlainText === true && marks.length === 0
		? escapePlainInlineMarkdown(text)
		: applyMarks(text, marks, options);
}

export function serializeList(
	node: TiptapJsonNode,
	kind: ListKind,
	options: TiptapMarkdownOptions,
): MarkdownBody {
	const start = numberAttr(node.attrs?.start) ?? 1;
	const items = (node.content ?? []).map((item, index) => {
		if (kind === "task") {
			const checked = item.attrs?.checked === true ? "x" : " ";
			return `- [${checked}] ${serializeListItem(item, options)}`;
		}

		const marker = kind === "ordered" ? `${start + index}.` : "-";
		return `${marker} ${serializeListItem(item, options)}`;
	});
	return joinSerializedListItems(items);
}

export function joinSerializedListItems(items: MarkdownLines): MarkdownBody {
	return items.reduce((markdown, item) => {
		if (!markdown) return item;
		return `${markdown}${markdown.endsWith("\n") ? "" : "\n"}${item}`;
	}, "");
}

export function serializeListItem(
	item: TiptapJsonNode,
	options: TiptapMarkdownOptions,
): string {
	const blocks = item.content ?? [];
	const [first, ...rest] = blocks;
	const firstText = first ? serializeBlockNode(first, options) : "";
	const nested = rest
		.map((block) => indentLines(serializeBlockNode(block, options), "  "))
		.filter(Boolean);
	return [firstText, ...nested].filter(Boolean).join("\n");
}

export function tableMarkdown(
	node: TiptapJsonNode,
	options: TiptapMarkdownOptions,
): MarkdownBody {
	const rows = (node.content ?? []).map((row) =>
		(row.content ?? []).map((cell) => ({
			alignment: tiptapTableCellAlignment(cell),
			text: serializeInlineChildren(cell.content ?? [], options),
		})),
	);
	if (rows.length === 0) return "";

	const [header, ...body] = rows;
	return mobileMarkdownTableSource({
		alignments: header.map((_cell, index) => tableColumnAlignment(rows, index)),
		headers: header.map((cell) => cell.text),
		rows: body.map((row) => row.map((cell) => cell.text)),
	});
}

export function tableColumnAlignment(
	rows: Array<Array<{ alignment: MobileMarkdownTableAlignment }>>,
	columnIndex: number,
): MobileMarkdownTableAlignment {
	return (
		rows
			.map((row) => row[columnIndex]?.alignment ?? "default")
			.find((alignment) => alignment !== "default") ?? "default"
	);
}

export function tiptapTableCellAlignment(
	node: TiptapJsonNode,
): MobileMarkdownTableAlignment {
	return (
		mobileMarkdownTableAlignment(node.attrs?.tolariaAlignment) ??
		mobileMarkdownTableAlignment(node.attrs?.align) ??
		mobileMarkdownTableAlignment(node.attrs?.textAlign) ??
		"default"
	);
}

export function mobileMarkdownTableAlignment(
	value: unknown,
): MobileMarkdownTableAlignment | null {
	return value === "center" ||
		value === "default" ||
		value === "left" ||
		value === "right"
		? value
		: null;
}

export function codeBlockMarkdown(node: TiptapJsonNode): MarkdownBody {
	const language =
		typeof node.attrs?.language === "string" ? node.attrs.language : "";
	const code = plainText(node.content ?? []);
	const fence = mobileMarkdownFenceForContent({ content: code });
	return `${fence}${language}\n${code}\n${fence}`;
}

export function displayMathMarkdown(node: TiptapJsonNode): MarkdownBody {
	const latex =
		typeof node.attrs?.latex === "string"
			? node.attrs.latex
			: typeof node.props?.latex === "string"
				? node.props.latex
				: "";
	return `$$\n${latex.trimEnd()}\n$$`;
}

export function imageMarkdown(
	node: TiptapJsonNode,
	options: TiptapMarkdownOptions,
): MarkdownBody {
	return mobileImageNodeMarkdown(node.attrs, options);
}

export function applyMarks(
	text: PlainText,
	marks: TiptapJsonMark[],
	options: TiptapMarkdownOptions,
): string {
	return marks.reduce(
		(current, mark) => applyMark(current, mark, options),
		text,
	);
}

export function applyMark(
	text: PlainText,
	mark: TiptapJsonMark,
	options: TiptapMarkdownOptions,
): string {
	if (mark.type === "code") return inlineCodeSource(text);
	if (mark.type === "bold") return `**${text}**`;
	if (mark.type === "italic") return `*${text}*`;
	if (mark.type === "strike") return `~~${text}~~`;
	if (mark.type === "highlight") return `==${text}==`;
	if (mark.type === "link") return linkMarkdown(text, mark.attrs, options);
	return text;
}

export function inlineCodeSource(text: PlainText): string {
	const escaped = text.replaceAll("`", "\\`");
	return `\`${escaped}\``;
}

export function linkMarkdown(
	text: LinkLabel,
	attrs: Record<string, unknown> | undefined,
	options: TiptapMarkdownOptions,
): string {
	const href =
		typeof attrs?.href === "string"
			? mobilePortableAttachmentHref(attrs.href, options.vaultRootUri)
			: "";
	if (!href) return text;
	if (href.startsWith("tolaria://due")) {
		const dateMatch = /[?&]date=([^&]+)/.exec(href);
		const timeMatch = /[?&]time=([^&]+)/.exec(href);
		const date = dateMatch ? decodeURIComponent(dateMatch[1]) : null;
		const time = timeMatch ? decodeURIComponent(timeMatch[1]) : null;
		if (date) {
			return time ? `📅 ${date} ⏰ ${time}` : `📅 ${date}`;
		}
		return text;
	}
	if (href.startsWith(WIKILINK_HREF_PREFIX)) {
		const target = decodeURIComponent(href.slice(WIKILINK_HREF_PREFIX.length));
		return target === text ? `[[${target}]]` : `[[${target}|${text}]]`;
	}
	const autolink = markdownAutolink(text, href);
	if (autolink) return autolink;
	return `[${escapeMarkdownLinkLabel(text)}](${escapeMarkdownLinkDestination(href)})`;
}

export function markdownAutolink(
	text: LinkLabel,
	href: UrlText,
): string | null {
	if (href === text && isMarkdownUriAutolink(href)) return `<${href}>`;
	if (href === `mailto:${text}` && isMarkdownEmailAutolink(text))
		return `<${text}>`;
	return null;
}

export function isMarkdownUriAutolink(value: UrlText): boolean {
	return /^(?:https?|mailto):\S+$/u.test(value) && !/[<>]/u.test(value);
}

export function isMarkdownEmailAutolink(value: LinkLabel): boolean {
	return /^[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/u.test(
		value,
	);
}

export function escapeMarkdownLinkLabel(text: LinkLabel): LinkLabel {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/\[/g, "\\[")
		.replace(/\]/g, "\\]");
}

export function escapeMarkdownLinkDestination(href: UrlText): UrlText {
	if (/[\s<>]/u.test(href)) return `<${href.replace(/>/g, "%3E")}>`;
	return href.replace(/\\/g, "\\\\").replace(/[()]/g, "\\$&");
}

export function escapePlainInlineMarkdown(text: PlainText): PlainText {
	const plainSourceSpans: string[] = [];
	const protectedText = text.replace(plainSourceSpanPattern, (span) => {
		const token = plainSourceSpanToken(plainSourceSpans.length);
		plainSourceSpans.push(span);
		return token;
	});

	const escapedText = protectedText
		.replace(/\\/g, "\\\\")
		.replace(/([`*_[\]])/g, "\\$1");

	return restorePlainSourceSpanTokens(escapedText, plainSourceSpans);
}

export function plainText(nodes: TiptapJsonNode[]): string {
	return nodes
		.map((node) =>
			node.type === "text" ? (node.text ?? "") : plainText(node.content ?? []),
		)
		.join("");
}

export function headingLevel(node: TiptapJsonNode): number {
	const level = numberAttr(node.attrs?.level);
	if (!level) return 1;
	return Math.max(1, Math.min(6, level));
}

export function numberAttr(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function isTiptapJsonNode(value: unknown): value is TiptapJsonNode {
	if (!value || typeof value !== "object") return false;
	const candidate = value as TiptapJsonNode;
	return typeof candidate.type === "string" || Array.isArray(candidate.content);
}

export const plainSourceSpanPattern =
	/\b(?:https?|mailto):[^\s<>()]+(?:\([^\s<>()]*\)[^\s<>()]*)*|\b[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gu;

export function plainSourceSpanToken(index: number): string {
	return `\u0000PLAINSOURCESPAN${index}\u0000`;
}

export function restorePlainSourceSpanTokens(
	text: PlainText,
	spans: PlainText[],
): PlainText {
	return spans.reduce(
		(current, span, index) =>
			current.replaceAll(plainSourceSpanToken(index), span),
		text,
	);
}
