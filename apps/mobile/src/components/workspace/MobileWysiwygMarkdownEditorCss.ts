import { type MobileMetrics, mobileMetrics } from "../../ui/mobileMetrics";
import {
	type MobileColors,
	mobilePalettes,
} from "../../ui/theme/mobilePalette";
import type { MobileNoteWidth } from "../../workspace/mobileWorkspaceModel";

type CssDeclaration = readonly [property: string, value: string | number];

export function mobileTentapEditorCss(
	compact: boolean,
	noteWidth: MobileNoteWidth | null | undefined = null,
	colors: MobileColors = mobilePalettes.light,
	metrics: MobileMetrics = mobileMetrics[1],
): string {
	const { editor: desktopEditorParity, space: mobileSpace } = metrics;
	const horizontalPadding = compact
		? mobileSpace.xl
		: desktopEditorParity.contentPaddingHorizontal;
	const h1FontSize = compact
		? metrics.size(30)
		: desktopEditorParity.h1FontSize;
	const h1LineHeight = compact
		? metrics.size(36)
		: desktopEditorParity.h1LineHeight;
	const wide = noteWidth === "wide";

	return [
		...documentRules(colors, metrics, { horizontalPadding, wide }),
		...headingRules(colors, metrics, { h1FontSize, h1LineHeight }),
		...blockRules(colors, metrics),
		...tableRules(colors, metrics),
		...wikilinkRules(),
		...dueBadgeRules(colors),
	].join("\n");
}

function dueBadgeRules(mobileColors: MobileColors): string[] {
	const calendarStarPath =
		"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V208Zm-31.38-94.36-29.84-2.31-11.43-26.5a8,8,0,0,0-14.7,0l-11.43,26.5-29.84,2.31a8,8,0,0,0-4.47,14.14l22.52,18.59-6.86,27.71a8,8,0,0,0,11.82,8.81L128,167.82l25.61,15.07a8,8,0,0,0,11.82-8.81l-6.86-27.71,22.52-18.59a8,8,0,0,0-4.47-14.14Zm-32.11,23.6a8,8,0,0,0-2.68,8.09l3.5,14.12-13.27-7.81a8,8,0,0,0-8.12,0l-13.27,7.81,3.5-14.12a8,8,0,0,0-2.68-8.09l-11.11-9.18,14.89-1.15a8,8,0,0,0,6.73-4.8l6-13.92,6,13.92a8,8,0,0,0,6.73,4.8l14.89,1.15Z";
	const calendarStarIcon = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="${calendarStarPath}"/></svg>`)}")`;
	const alarmPath =
		"M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM61.66,37.66l-32,32A8,8,0,0,1,18.34,58.34l32-32A8,8,0,0,1,61.66,37.66Zm176,32a8,8,0,0,1-11.32,0l-32-32a8,8,0,0,1,11.32-11.32l32,32A8,8,0,0,1,237.66,69.66ZM184,128a8,8,0,0,1,0,16H128a8,8,0,0,1-8-8V80a8,8,0,0,1,16,0v48Z";
	const alarmIcon = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="${alarmPath}"/></svg>`)}")`;

	const selector = '.ProseMirror a[href^="tolaria://due"]';
	const overdueSelector =
		'.ProseMirror a[href^="tolaria://due"].tolaria-due-overdue';
	return [
		cssRule(selector, [
			["background-color", "rgba(99, 102, 241, 0.12)"],
			["border", "1px solid rgba(99, 102, 241, 0.28)"],
			["border-radius", "6px"],
			["color", mobileColors.primary],
			["display", "inline-flex"],
			["align-items", "center"],
			["font-size", "0.88em"],
			["font-weight", 600],
			["margin", "0 2px"],
			["padding", "1px 6px"],
			["text-decoration", "none"],
			["vertical-align", "baseline"],
			["white-space", "nowrap"],
		]),
		cssRule(`${selector}::before`, [
			["content", '""'],
			["display", "inline-block"],
			["width", "0.92em"],
			["height", "0.92em"],
			["margin-right", "0.28em"],
			["vertical-align", "-0.12em"],
			["background-color", "currentColor"],
			["-webkit-mask", `${calendarStarIcon} center / contain no-repeat`],
			["mask", `${calendarStarIcon} center / contain no-repeat`],
		]),
		cssRule(`${selector} .tolaria-due-time::before`, [
			["content", '""'],
			["display", "inline-block"],
			["width", "0.88em"],
			["height", "0.88em"],
			["margin-left", "0.36em"],
			["margin-right", "0.22em"],
			["vertical-align", "-0.1em"],
			["background-color", "currentColor"],
			["-webkit-mask", `${alarmIcon} center / contain no-repeat`],
			["mask", `${alarmIcon} center / contain no-repeat`],
		]),
		cssRule(overdueSelector, [
			["background-color", "rgba(239, 68, 68, 0.12)"],
			["border-color", "rgba(239, 68, 68, 0.28)"],
			["color", mobileColors.danger],
		]),
	];
}

function wikilinkRules(): string[] {
	// Phosphor FileText regular, matching the note icon used elsewhere in the app.
	const path =
		"m213.66 82.34-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31 188.69 80H160ZM200 216H56V40h88v48a8 8 0 0 0 8 8h48zm-32-80a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8m0 32a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8";
	const icon = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="${path}"/></svg>`)}")`;
	const selector = '.ProseMirror a[href^="tolaria://wikilink/"]';
	return [
		cssRule(selector, [
			["text-decoration", "underline dotted"],
			["text-underline-offset", "2px"],
			["border-radius", "2px"],
			["padding", "0 1px"],
		]),
		cssRule(`${selector}::before`, [
			["content", '""'],
			["display", "inline-block"],
			["width", "0.9em"],
			["height", "0.9em"],
			["margin-right", "0.2em"],
			["vertical-align", "-0.1em"],
			["background-color", "currentColor"],
			["-webkit-mask", `${icon} center / contain no-repeat`],
			["mask", `${icon} center / contain no-repeat`],
		]),
	];
}

function documentRules(
	mobileColors: MobileColors,
	metrics: MobileMetrics,
	{ horizontalPadding, wide }: { horizontalPadding: number; wide: boolean },
): string[] {
	const desktopEditorParity = metrics.editor;
	const widePadding = `clamp(${metrics.size(24)}px, 4vw, ${metrics.size(72)}px)`;
	return [
		cssRule("html, body", [
			["background", mobileColors.editor],
			["color", mobileColors.text],
			[
				"font-family",
				'-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
			],
			["font-size", `${desktopEditorParity.bodyFontSize}px`],
			["line-height", `${desktopEditorParity.bodyLineHeight}px`],
			["margin", 0],
			["padding", 0],
		]),
		cssRule("#root > div:first-child", [["overflow-x", "hidden"]]),
		cssRule(".ProseMirror", [
			["box-sizing", "border-box"],
			["caret-color", mobileColors.primary],
			["margin", wide ? "0" : "0 auto"],
			["max-width", wide ? "none" : `${desktopEditorParity.contentMaxWidth}px`],
			["min-height", "100vh"],
			["outline", "none"],
			["overflow-wrap", "anywhere"],
			[
				"padding",
				`${desktopEditorParity.contentPaddingVertical}px ${wide ? widePadding : `${horizontalPadding}px`} ${metrics.size(96)}px`,
			],
			["width", "100%"],
		]),
	];
}

function headingRules(
	mobileColors: MobileColors,
	metrics: MobileMetrics,
	{ h1FontSize, h1LineHeight }: { h1FontSize: number; h1LineHeight: number },
): string[] {
	const desktopEditorParity = metrics.editor;
	return [
		cssRule(".ProseMirror h1", [
			["border-bottom", `1px solid ${mobileColors.border}`],
			["color", mobileColors.text],
			["font-size", `${h1FontSize}px`],
			["font-weight", 700],
			["line-height", `${h1LineHeight}px`],
			["margin", `0 0 ${desktopEditorParity.h1MarginBottom}px`],
			["padding-bottom", `${desktopEditorParity.h1PaddingBottom}px`],
		]),
		headingRule(mobileColors, ".ProseMirror h2", {
			fontSize: desktopEditorParity.h2FontSize,
			lineHeight: desktopEditorParity.h2LineHeight,
			marginBottom: desktopEditorParity.h2MarginBottom,
			marginTop: desktopEditorParity.h2MarginTop,
		}),
		headingRule(mobileColors, ".ProseMirror h3", {
			fontSize: desktopEditorParity.h3FontSize,
			lineHeight: desktopEditorParity.h3LineHeight,
			marginBottom: desktopEditorParity.h3MarginBottom,
			marginTop: desktopEditorParity.h3MarginTop,
		}),
		headingRule(mobileColors, ".ProseMirror h4", {
			fontSize: desktopEditorParity.h4FontSize,
			lineHeight: desktopEditorParity.h4LineHeight,
			marginBottom: desktopEditorParity.h4MarginBottom,
			marginTop: desktopEditorParity.h4MarginTop,
		}),
	];
}

function blockRules(
	mobileColors: MobileColors,
	metrics: MobileMetrics,
): string[] {
	const { editor: desktopEditorParity, space: mobileSpace } = metrics;
	return [
		cssRule(".ProseMirror p", [
			["margin", `0 0 ${desktopEditorParity.paragraphSpacing}px`],
		]),
		cssRule(".ProseMirror blockquote", [
			["border-left", `3px solid ${mobileColors.primary}`],
			["color", mobileColors.textMuted],
			["font-style", "italic"],
			["margin", `${desktopEditorParity.quoteMarginVertical}px 0`],
			["padding-left", `${desktopEditorParity.quotePaddingLeft}px`],
		]),
		cssRule(".ProseMirror code", [
			["background", mobileColors.graySoft],
			["border-radius", "4px"],
			["font-family", "Menlo, monospace"],
			["font-size", `${desktopEditorParity.inlineCodeFontSize}px`],
			[
				"padding",
				`${desktopEditorParity.inlineCodePaddingVertical}px ${desktopEditorParity.inlineCodePaddingHorizontal}px`,
			],
		]),
		cssRule(".ProseMirror pre", [
			["background", mobileColors.graySoft],
			["border-radius", "6px"],
			["overflow-x", "auto"],
			["padding", `${mobileSpace.md}px`],
		]),
		cssRule(".ProseMirror ul, .ProseMirror ol", [
			["margin", `0 0 ${desktopEditorParity.paragraphSpacing}px`],
			[
				"padding-left",
				`${desktopEditorParity.listIndentSize + desktopEditorParity.listPaddingLeft}px`,
			],
		]),
		cssRule(".ProseMirror li", [
			["margin", `${desktopEditorParity.listItemSpacing}px 0`],
		]),
		cssRule(".ProseMirror hr", [
			["border", 0],
			[
				"border-top",
				`${desktopEditorParity.horizontalRuleThickness}px solid ${mobileColors.border}`,
			],
			["margin", `${desktopEditorParity.horizontalRuleMarginVertical}px 0`],
		]),
	];
}

function tableRules(
	mobileColors: MobileColors,
	metrics: MobileMetrics,
): string[] {
	const { editor: desktopEditorParity, space: mobileSpace } = metrics;
	return [
		cssRule(".ProseMirror .tableWrapper", [
			["max-width", "100%"],
			["overflow-x", "auto"],
			["overscroll-behavior-x", "contain"],
		]),
		cssRule(".ProseMirror table", [
			["border-collapse", "collapse"],
			["font-size", `${desktopEditorParity.tableFontSize}px`],
			["margin", `${mobileSpace.md}px 0`],
			["width", "100%"],
		]),
		cssRule(".ProseMirror th, .ProseMirror td", [
			["border", `1px solid ${mobileColors.border}`],
			[
				"padding",
				`${desktopEditorParity.tableCellPaddingVertical}px ${desktopEditorParity.tableCellPaddingHorizontal}px`,
			],
			["text-align", "left"],
		]),
		cssRule(".ProseMirror a", [["color", mobileColors.primary]]),
	];
}

function headingRule(
	mobileColors: MobileColors,
	selector: string,
	tokens: {
		fontSize: number;
		lineHeight: number;
		marginBottom: number;
		marginTop: number;
	},
): string {
	return cssRule(selector, [
		["color", mobileColors.text],
		["font-size", `${tokens.fontSize}px`],
		["font-weight", 700],
		["line-height", `${tokens.lineHeight}px`],
		["margin", `${tokens.marginTop}px 0 ${tokens.marginBottom}px`],
	]);
}

function cssRule(
	selector: string,
	declarations: readonly CssDeclaration[],
): string {
	const body = declarations
		.map(([property, value]) => `      ${property}: ${value};`)
		.join("\n");
	return `    ${selector} {\n${body}\n    }`;
}
