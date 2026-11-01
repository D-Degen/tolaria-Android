import { StyleSheet } from "react-native";
import type { MobileMetrics } from "../../ui/mobileMetrics";
import type { MobileColors } from "../../ui/theme/mobilePalette";
import { mobileRadius } from "../../ui/tokens";

export function createSourceEditorStyles(
	mobileColors: MobileColors,
	metrics: MobileMetrics,
) {
	return {
		editorStyles: {
			...createInputStyles(mobileColors, metrics),
			...createSyntaxStyles(mobileColors, metrics),
			...createFrontmatterStyles(mobileColors, metrics),
			...createSuggestionStyles(mobileColors, metrics),
		},
	};
}

function createInputStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
	const { editor: desktopEditorParity, space: mobileSpace } = metrics;
	const bottomBuffer =
		mobileSpace.md + Math.round(desktopEditorParity.bodyLineHeight * 2);
	return StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: mobileColors.editor,
		},
		editorBody: {
			minHeight: 0,
			flex: 1,
		},
		highlightedInput: {
			...StyleSheet.absoluteFill,
			backgroundColor: "transparent",
			borderColor: "transparent",
			borderWidth: 0,
			color: "transparent",
			fontFamily: "Menlo",
			fontSize: desktopEditorParity.bodyFontSize,
			lineHeight: desktopEditorParity.bodyLineHeight,
			paddingHorizontal: mobileSpace.md,
			paddingTop: mobileSpace.md,
			paddingBottom: bottomBuffer,
		},
		input: {
			flex: 1,
			minHeight: 0,
			borderWidth: 0,
			color: mobileColors.text,
			fontFamily: "Menlo",
			fontSize: desktopEditorParity.bodyFontSize,
			lineHeight: desktopEditorParity.bodyLineHeight,
			paddingHorizontal: mobileSpace.md,
			paddingTop: mobileSpace.md,
			paddingBottom: bottomBuffer,
		},
		sourceInputHost: {
			flex: 1,
			minHeight: 0,
			backgroundColor: mobileColors.editor,
			borderColor: "transparent",
			borderWidth: 0,
			overflow: "hidden",
			position: "relative",
		},
	});
}

function createSyntaxStyles(
	mobileColors: MobileColors,
	metrics: MobileMetrics,
) {
	const { editor: desktopEditorParity, space: mobileSpace } = metrics;
	const bottomBuffer =
		mobileSpace.md + Math.round(desktopEditorParity.bodyLineHeight * 2);
	return StyleSheet.create({
		syntaxAttachment: { color: mobileColors.orange },
		syntaxCodeFence: { color: mobileColors.syntaxCode },
		syntaxEmphasis: { color: mobileColors.textMuted, fontStyle: "italic" },
		syntaxHeading: { color: mobileColors.syntaxHeading, fontWeight: "700" },
		syntaxInlineCode: { color: mobileColors.syntaxCode },
		syntaxLayer: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			paddingHorizontal: mobileSpace.md,
			paddingTop: mobileSpace.md,
			paddingBottom: bottomBuffer,
		},
		syntaxListMarker: { color: mobileColors.primary },
		syntaxMeta: { color: mobileColors.syntaxMuted },
		syntaxPropertyKey: { color: mobileColors.syntaxPropertyKey },
		syntaxQuote: { color: mobileColors.textMuted, fontStyle: "italic" },
		syntaxStrong: { color: mobileColors.text, fontWeight: "700" },
		syntaxTable: { color: mobileColors.textMuted },
		syntaxText: {
			color: mobileColors.text,
			fontFamily: "Menlo",
			fontSize: desktopEditorParity.bodyFontSize,
			lineHeight: desktopEditorParity.bodyLineHeight,
		},
		syntaxWikilink: { color: mobileColors.syntaxLink },
	});
}

function createFrontmatterStyles(
	mobileColors: MobileColors,
	metrics: MobileMetrics,
) {
	const { space: mobileSpace, type: mobileType } = metrics;
	return StyleSheet.create({
		frontmatterIssue: {
			alignItems: "center",
			backgroundColor: mobileColors.warningSoft,
			borderColor: mobileColors.warningBorder,
			borderRadius: mobileRadius.md,
			borderWidth: StyleSheet.hairlineWidth,
			flexDirection: "row",
			gap: mobileSpace.xs,
			paddingHorizontal: mobileSpace.md,
			paddingVertical: mobileSpace.sm,
		},
		frontmatterIssueLabel: {
			color: mobileColors.warning,
			fontSize: mobileType.caption,
			fontWeight: "600",
		},
		frontmatterIssueText: {
			color: mobileColors.warning,
			flex: 1,
			fontSize: mobileType.caption,
		},
	});
}

function createSuggestionStyles(
	mobileColors: MobileColors,
	metrics: MobileMetrics,
) {
	const { space: mobileSpace, type: mobileType } = metrics;
	return StyleSheet.create({
		suggestionRow: {
			minHeight: 32,
			alignItems: "center",
			flexDirection: "row",
			gap: mobileSpace.sm,
			borderRadius: 6,
			paddingHorizontal: mobileSpace.sm,
			paddingVertical: mobileSpace.xs,
		},
		suggestionRowPressed: {
			backgroundColor: mobileColors.graySoft,
		},
		suggestions: {
			gap: mobileSpace.xs,
			borderTopColor: mobileColors.border,
			borderTopWidth: StyleSheet.hairlineWidth,
			backgroundColor: mobileColors.editor,
			paddingHorizontal: mobileSpace.md,
			paddingVertical: mobileSpace.xs,
		},
		suggestionTitle: {
			minWidth: 0,
			flex: 1,
			color: mobileColors.text,
			fontSize: mobileType.body,
			fontWeight: "500",
		},
		toolbarHost: {
			flexShrink: 0,
			borderTopColor: mobileColors.border,
			borderTopWidth: StyleSheet.hairlineWidth,
			backgroundColor: mobileColors.editor,
			paddingHorizontal: mobileSpace.md,
		},
	});
}
