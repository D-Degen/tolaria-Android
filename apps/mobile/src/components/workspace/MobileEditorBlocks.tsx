import {
	Alarm,
	CalendarStar,
	CheckSquare,
	Square,
} from "phosphor-react-native";
import {
	type LayoutChangeEvent,
	StyleSheet,
	type TextStyle,
	View,
} from "react-native";
import type { MobileMetrics } from "../../ui/mobileMetrics";
import { useMobileStyles } from "../../ui/theme/useMobileTheme";
import {
	mobileTableOfContentsTargetIdsForBlocks,
	mobileTableOfContentsTitleTargetId,
} from "../../workspace/mobileTableOfContents";
import type {
	MobileEditorBlock,
	MobileEditorInline,
	MobileEditorListItem,
	MobileEditorOrderedListItem,
	MobileEditorTaskItem,
} from "../../workspace/mobileWorkspaceModel";
import { Text } from "../ui/text";
import { createEditorBlockStyles as createThemeStyles } from "./mobileEditorBlockStyles";

type MobileEditorBlocksProps = {
	blocks: MobileEditorBlock[];
	fallbackBullets: string[];
	renderTitleBlock?: boolean;
	tableOfContentsTitle?: string;
	onTableOfContentsTargetLayout?: (
		targetId: string,
		event: LayoutChangeEvent,
	) => void;
	onOpenLink?: (href: string) => void;
	onNavigateWikilink: (target: string) => void;
};

type EditorListProps =
	| {
			items: MobileEditorListItem[];
			onOpenLink?: (href: string) => void;
			onNavigateWikilink: (target: string) => void;
			variant: "bullet";
	  }
	| {
			items: MobileEditorOrderedListItem[];
			onOpenLink?: (href: string) => void;
			onNavigateWikilink: (target: string) => void;
			variant: "ordered";
	  }
	| {
			items: MobileEditorTaskItem[];
			onOpenLink?: (href: string) => void;
			onNavigateWikilink: (target: string) => void;
			variant: "task";
	  };

const bulletSymbols = ["•", "◦", "▪"] as const;

export function MobileEditorBlocks({
	blocks,
	fallbackBullets,
	renderTitleBlock = true,
	tableOfContentsTitle = "",
	onTableOfContentsTargetLayout,
	onOpenLink,
	onNavigateWikilink,
}: MobileEditorBlocksProps) {
	if (blocks.length === 0) {
		return <FallbackBullets bullets={fallbackBullets} />;
	}

	const tableOfContentsTargetIds = mobileTableOfContentsTargetIdsForBlocks({
		blocks,
		title: tableOfContentsTitle,
	});
	const titleText = tableOfContentsTitle.trim();
	const renderStandaloneTitleBlock = shouldRenderTitleBlock(
		blocks,
		titleText,
		renderTitleBlock,
	);

	return (
		<>
			{renderStandaloneTitleBlock ? (
				<EditorTitleBlock
					text={titleText}
					tableOfContentsTargetId={mobileTableOfContentsTitleTargetId}
					onTableOfContentsTargetLayout={onTableOfContentsTargetLayout}
				/>
			) : null}
			{blocks.map((block, index) => {
				return (
					<EditorBlock
						block={block}
						key={`${block.kind}-${index}`}
						tableOfContentsTargetId={tableOfContentsTargetIds[index]}
						onTableOfContentsTargetLayout={onTableOfContentsTargetLayout}
						onOpenLink={onOpenLink}
						onNavigateWikilink={onNavigateWikilink}
					/>
				);
			})}
		</>
	);
}

function FallbackBullets({ bullets }: { bullets: string[] }) {
	const themeStyles = useMobileStyles(createThemeStyles);
	const { listStyles, textStyles } = themeStyles;
	return (
		<>
			{bullets.map((item) => (
				<View key={item} style={listStyles.row} testID="editor-bullet-row">
					<Text style={listStyles.marker}>•</Text>
					<Text style={textStyles.body}>{item}</Text>
				</View>
			))}
		</>
	);
}

function EditorBlock({
	block,
	tableOfContentsTargetId,
	onTableOfContentsTargetLayout,
	onOpenLink,
	onNavigateWikilink,
}: {
	block: MobileEditorBlock;
	tableOfContentsTargetId?: string;
	onTableOfContentsTargetLayout?: (
		targetId: string,
		event: LayoutChangeEvent,
	) => void;
	onOpenLink?: (href: string) => void;
	onNavigateWikilink: (target: string) => void;
}) {
	const themeStyles = useMobileStyles(createThemeStyles);
	const { dividerStyles } = themeStyles;
	if (block.kind === "paragraph")
		return (
			<EditorParagraph
				block={block}
				onOpenLink={onOpenLink}
				onNavigateWikilink={onNavigateWikilink}
			/>
		);
	if (block.kind === "heading") {
		return (
			<EditorHeading
				block={block}
				tableOfContentsTargetId={tableOfContentsTargetId}
				onTableOfContentsTargetLayout={onTableOfContentsTargetLayout}
			/>
		);
	}
	if (block.kind === "bullets")
		return (
			<EditorList
				items={block.items}
				variant="bullet"
				onOpenLink={onOpenLink}
				onNavigateWikilink={onNavigateWikilink}
			/>
		);
	if (block.kind === "orderedList")
		return (
			<EditorList
				items={block.items}
				variant="ordered"
				onOpenLink={onOpenLink}
				onNavigateWikilink={onNavigateWikilink}
			/>
		);
	if (block.kind === "tasks")
		return (
			<EditorList
				items={block.items}
				variant="task"
				onOpenLink={onOpenLink}
				onNavigateWikilink={onNavigateWikilink}
			/>
		);
	if (block.kind === "quote")
		return (
			<EditorQuote
				content={block.content}
				onOpenLink={onOpenLink}
				onNavigateWikilink={onNavigateWikilink}
			/>
		);
	if (block.kind === "codeBlock")
		return (
			<EditorCodeBlock code={block.code} language={block.language ?? null} />
		);
	if (block.kind === "divider")
		return <View style={dividerStyles.divider} testID="editor-divider" />;
	return <EditorTable headers={block.headers} rows={block.rows} />;
}

function EditorParagraph({
	block,
	onOpenLink,
	onNavigateWikilink,
}: {
	block: Extract<MobileEditorBlock, { kind: "paragraph" }>;
	onOpenLink?: (href: string) => void;
	onNavigateWikilink: (target: string) => void;
}) {
	const themeStyles = useMobileStyles(createThemeStyles);
	const { textStyles } = themeStyles;
	return (
		<InlineText
			content={block.content}
			style={textStyles.paragraph}
			testID="editor-paragraph"
			onOpenLink={onOpenLink}
			onNavigateWikilink={onNavigateWikilink}
		/>
	);
}

function EditorHeading({
	block,
	tableOfContentsTargetId,
	onTableOfContentsTargetLayout,
}: {
	block: Extract<MobileEditorBlock, { kind: "heading" }>;
	tableOfContentsTargetId?: string;
	onTableOfContentsTargetLayout?: (
		targetId: string,
		event: LayoutChangeEvent,
	) => void;
}) {
	const themeStyles = useMobileStyles(createThemeStyles);
	if (block.level === 1) {
		return (
			<EditorTitleBlock
				text={block.text}
				tableOfContentsTargetId={tableOfContentsTargetId}
				onTableOfContentsTargetLayout={onTableOfContentsTargetLayout}
			/>
		);
	}

	return (
		<Text
			onLayout={
				tableOfContentsTargetId
					? (event) =>
							onTableOfContentsTargetLayout?.(tableOfContentsTargetId, event)
					: undefined
			}
			style={headingStylesForLevel(themeStyles, block.level)}
			testID={`editor-heading-${block.level}`}
		>
			{block.text}
		</Text>
	);
}

function EditorTitleBlock({
	text,
	tableOfContentsTargetId,
	onTableOfContentsTargetLayout,
}: {
	text: string;
	tableOfContentsTargetId?: string;
	onTableOfContentsTargetLayout?: (
		targetId: string,
		event: LayoutChangeEvent,
	) => void;
}) {
	const themeStyles = useMobileStyles(createThemeStyles);
	const { titleBlockStyles } = themeStyles;
	return (
		<View
			onLayout={
				tableOfContentsTargetId
					? (event) =>
							onTableOfContentsTargetLayout?.(tableOfContentsTargetId, event)
					: undefined
			}
			style={titleBlockStyles.container}
			testID="editor-title-block"
		>
			<Text style={headingStylesForLevel(themeStyles, 1)} testID="editor-title">
				{text}
			</Text>
		</View>
	);
}

function EditorList(props: EditorListProps) {
	const themeStyles = useMobileStyles(createThemeStyles);
	const { listStyles } = themeStyles;
	return (
		<View style={listStyles.group}>
			{props.items.map((item, index) => editorListRow(props, item, index))}
		</View>
	);
}

function editorListRow(
	props: EditorListProps,
	item: MobileEditorListItem,
	index: number,
) {
	if (props.variant === "task") {
		return (
			<TaskRow
				item={item as MobileEditorTaskItem}
				key={`task-${index}`}
				testID="editor-task-row"
				onOpenLink={props.onOpenLink}
				onNavigateWikilink={props.onNavigateWikilink}
			/>
		);
	}

	return (
		<ListRow
			item={item}
			key={`${props.variant}-${index}`}
			marker={listMarker(props.variant, item)}
			testID={`editor-${props.variant}-row`}
			textTestID={`editor-${props.variant}-text`}
			onOpenLink={props.onOpenLink}
			onNavigateWikilink={props.onNavigateWikilink}
		/>
	);
}

function ListRow({
	item,
	marker,
	onOpenLink,
	onNavigateWikilink,
	testID,
	textTestID,
}: {
	item: MobileEditorListItem;
	marker: string;
	onOpenLink?: (href: string) => void;
	onNavigateWikilink: (target: string) => void;
	testID: string;
	textTestID: string;
}) {
	const themeStyles = useMobileStyles(createThemeStyles);
	const { listStyles, textStyles } = themeStyles;
	return (
		<View
			style={[listStyles.row, listDepthStyle(themeStyles.metrics, item.depth)]}
			testID={testID}
		>
			<Text style={listStyles.marker}>{marker}</Text>
			<InlineText
				content={item.content}
				style={textStyles.body}
				testID={textTestID}
				onOpenLink={onOpenLink}
				onNavigateWikilink={onNavigateWikilink}
			/>
		</View>
	);
}

function TaskRow({
	item,
	onOpenLink,
	onNavigateWikilink,
	testID,
}: {
	item: MobileEditorTaskItem;
	onOpenLink?: (href: string) => void;
	onNavigateWikilink: (target: string) => void;
	testID: string;
}) {
	const themeStyles = useMobileStyles(createThemeStyles);
	const { listStyles, mobileColors, textStyles } = themeStyles;
	const Icon = item.checked ? CheckSquare : Square;

	return (
		<View
			style={[
				listStyles.taskRow,
				listDepthStyle(themeStyles.metrics, item.depth),
			]}
			testID={testID}
		>
			<View style={listStyles.taskIcon}>
				<Icon
					color={item.checked ? mobileColors.primary : mobileColors.textMuted}
					size={themeStyles.metrics.editor.listCheckboxSize}
					weight={item.checked ? "fill" : "regular"}
				/>
			</View>
			<InlineText
				content={item.content}
				style={textStyles.body}
				testID="editor-task-text"
				onOpenLink={onOpenLink}
				onNavigateWikilink={onNavigateWikilink}
			/>
		</View>
	);
}

function EditorQuote({
	content,
	onOpenLink,
	onNavigateWikilink,
}: {
	content: MobileEditorInline[];
	onOpenLink?: (href: string) => void;
	onNavigateWikilink: (target: string) => void;
}) {
	const themeStyles = useMobileStyles(createThemeStyles);
	const { quoteStyles } = themeStyles;
	return (
		<View style={quoteStyles.container} testID="editor-quote">
			<InlineText
				content={content}
				style={quoteStyles.text}
				testID="editor-quote-text"
				onOpenLink={onOpenLink}
				onNavigateWikilink={onNavigateWikilink}
			/>
		</View>
	);
}

function EditorCodeBlock({
	code,
	language,
}: {
	code: string;
	language: string | null;
}) {
	const themeStyles = useMobileStyles(createThemeStyles);
	const { codeBlockStyles } = themeStyles;
	return (
		<View style={codeBlockStyles.container} testID="editor-code-block">
			{language ? (
				<Text style={codeBlockStyles.language} testID="editor-code-language">
					{language}
				</Text>
			) : null}
			<Text selectable style={codeBlockStyles.code}>
				{code}
			</Text>
		</View>
	);
}

function InlineText({
	content,
	onOpenLink,
	onNavigateWikilink,
	style,
	testID,
}: {
	content: MobileEditorInline[];
	onOpenLink?: (href: string) => void;
	onNavigateWikilink: (target: string) => void;
	style: TextStyle;
	testID?: string;
}) {
	const themeStyles = useMobileStyles(createThemeStyles);
	return (
		<Text style={style} testID={testID}>
			{content.map((segment, index) => {
				if (segment.due) {
					return (
						<InlineDueBadge
							key={`${segment.text}-${index}`}
							due={segment.due}
							themeStyles={themeStyles}
						/>
					);
				}
				return (
					<Text
						key={`${segment.text}-${index}`}
						style={inlineSegmentStyles(themeStyles, segment)}
						testID={inlineSegmentTestId(segment)}
						onPress={inlineSegmentPressHandler(
							segment,
							onNavigateWikilink,
							onOpenLink,
						)}
					>
						{segment.text}
					</Text>
				);
			})}
		</Text>
	);
}

function checkIfDueOverdue(dateStr: string, timeStr?: string): boolean {
	try {
		const today = new Date().toISOString().slice(0, 10);
		let normalized = dateStr;
		if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
			const [d, m, y] = dateStr.split(".");
			normalized = `${y}-${(m ?? "1").padStart(2, "0")}-${(d ?? "1").padStart(2, "0")}`;
		}
		if (normalized < today) return true;
		if (normalized === today && timeStr) {
			const now = new Date();
			const currentHoursMinutes = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
			return timeStr < currentHoursMinutes;
		}
		return false;
	} catch {
		return false;
	}
}

function InlineDueBadge({
	due,
	themeStyles,
}: {
	due: { date: string; time?: string };
	themeStyles: ReturnType<typeof createThemeStyles>;
}) {
	const { mobileColors, metrics } = themeStyles;
	const isOverdue = checkIfDueOverdue(due.date, due.time);
	const badgeColor = isOverdue ? mobileColors.danger : mobileColors.primary;
	const bgColor = isOverdue
		? "rgba(239, 68, 68, 0.12)"
		: "rgba(99, 102, 241, 0.12)";
	const borderColor = isOverdue
		? "rgba(239, 68, 68, 0.3)"
		: "rgba(99, 102, 241, 0.3)";

	return (
		<View
			style={[
				inlineDueBadgeStyles.badge,
				{
					backgroundColor: bgColor,
					borderColor,
				},
			]}
			testID="editor-due-badge"
		>
			<CalendarStar color={badgeColor} size={metrics.size(12)} />
			<Text style={[inlineDueBadgeStyles.dateText, { color: badgeColor }]}>
				{` ${due.date}`}
			</Text>
			{due.time ? (
				<>
					<Alarm
						color={badgeColor}
						size={metrics.size(11)}
						style={inlineDueBadgeStyles.timeIcon}
					/>
					<Text style={[inlineDueBadgeStyles.timeText, { color: badgeColor }]}>
						{` ${due.time}`}
					</Text>
				</>
			) : null}
		</View>
	);
}

const inlineDueBadgeStyles = StyleSheet.create({
	badge: {
		alignItems: "center",
		borderRadius: 6,
		borderWidth: 1,
		flexDirection: "row",
		marginHorizontal: 3,
		paddingHorizontal: 6,
		paddingVertical: 2,
		verticalAlign: "middle",
	},
	dateText: {
		fontSize: 12,
		fontWeight: "600",
	},
	timeIcon: {
		marginLeft: 4,
	},
	timeText: {
		fontSize: 12,
		fontWeight: "600",
	},
});

function EditorTable({
	headers,
	rows,
}: {
	headers: string[];
	rows: string[][];
}) {
	const themeStyles = useMobileStyles(createThemeStyles);
	const { tableStyles } = themeStyles;
	return (
		<View style={tableStyles.table} testID="editor-table">
			<View style={[tableStyles.row, tableStyles.headerRow]}>
				{headers.map((header) => (
					<Text key={header} style={[tableStyles.cell, tableStyles.headerCell]}>
						{header}
					</Text>
				))}
			</View>
			{rows.map((row, rowIndex) => (
				<View key={`row-${rowIndex}`} style={tableStyles.row}>
					{row.map((cell, cellIndex) => (
						<Text key={`${cell}-${cellIndex}`} style={tableStyles.cell}>
							{cell}
						</Text>
					))}
				</View>
			))}
		</View>
	);
}

function headingStylesForLevel(
	themeStyles: ReturnType<typeof createThemeStyles>,
	level: number,
) {
	const { textStyles } = themeStyles;
	if (level === 1) return [textStyles.heading, textStyles.headingOne];
	if (level === 2) return textStyles.heading;
	if (level === 3) return [textStyles.heading, textStyles.headingSmall];
	return [textStyles.heading, textStyles.headingFour];
}

function inlineSegmentStyles(
	themeStyles: ReturnType<typeof createThemeStyles>,
	segment: MobileEditorInline,
): TextStyle[] {
	const { inlineStyles } = themeStyles;
	const styles: TextStyle[] = [];
	if (segment.bold) styles.push(inlineStyles.bold);
	if (segment.italic) styles.push(inlineStyles.italic);
	if (segment.code) styles.push(inlineStyles.code);
	if (segment.strike) styles.push(inlineStyles.strike);
	if (segment.linkHref) styles.push(inlineStyles.link);
	if (segment.wikilinkTarget) styles.push(inlineStyles.wikilink);
	return styles;
}

function inlineSegmentTestId(segment: MobileEditorInline): string | undefined {
	if (segment.wikilinkTarget)
		return `editor-wikilink-${testIdSegment(segment.wikilinkTarget)}`;
	if (segment.linkHref) return `editor-link-${testIdSegment(segment.linkHref)}`;
	if (segment.strike) return "editor-strikethrough";
	return undefined;
}

function inlineSegmentPressHandler(
	segment: MobileEditorInline,
	onNavigateWikilink: (target: string) => void,
	onOpenLink?: (href: string) => void,
) {
	if (segment.wikilinkTarget)
		return () => onNavigateWikilink(segment.wikilinkTarget ?? "");
	if (segment.linkHref && onOpenLink)
		return () => onOpenLink(segment.linkHref ?? "");
	return undefined;
}

function listMarker(
	variant: Exclude<EditorListProps["variant"], "task">,
	item: MobileEditorListItem,
) {
	if (variant === "ordered")
		return (item as MobileEditorOrderedListItem).marker;
	return bulletSymbols[(item.depth ?? 0) % bulletSymbols.length];
}

function listDepthStyle(metrics: MobileMetrics, depth: number | undefined) {
	return depth ? { paddingLeft: depth * metrics.editor.listIndentSize } : null;
}

function shouldRenderTitleBlock(
	blocks: MobileEditorBlock[],
	title: string,
	enabled: boolean,
) {
	if (!enabled || !title) return false;
	if (blocks.length === 0) return false;
	const firstBlock = blocks[0];
	return firstBlock?.kind !== "heading" || firstBlock.level !== 1;
}

function testIdSegment(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}
