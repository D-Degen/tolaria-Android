import { describe, expect, it } from "vitest";
import { desktopEditorParity } from "../../ui/desktopParity";
import { mobileTentapEditorCss } from "./MobileWysiwygMarkdownEditorCss";

describe("mobile TenTap editor CSS", () => {
	it("keeps H4 spacing separate from H3 using desktop editor tokens", () => {
		const css = mobileTentapEditorCss(false);

		expect(cssBlock(css, ".ProseMirror h3")).toContain(
			`margin: ${desktopEditorParity.h3MarginTop}px 0 ${desktopEditorParity.h3MarginBottom}px;`,
		);
		expect(cssBlock(css, ".ProseMirror h4")).toContain(
			`margin: ${desktopEditorParity.h4MarginTop}px 0 ${desktopEditorParity.h4MarginBottom}px;`,
		);
	});

	it("removes the normal desktop max width in wide-note mode", () => {
		const css = mobileTentapEditorCss(false, "wide");
		const proseMirror = cssBlock(css, ".ProseMirror");

		expect(proseMirror).toContain("max-width: none;");
		expect(proseMirror).toContain("margin: 0;");
		expect(proseMirror).toContain(
			"padding: 20px clamp(24px, 4vw, 72px) 160px;",
		);
	});

	it("maintains a 1-2 line keyboard scroll clearance above bottom edge", () => {
		const css = mobileTentapEditorCss(false);
		const rootScroll = cssBlock(css, "#root > div:first-child");
		const blockScroll = cssBlock(
			css,
			".ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6, .ProseMirror li, .ProseMirror blockquote, .ProseMirror pre",
		);

		expect(rootScroll).toContain("scroll-padding-bottom: 46px;");
		expect(blockScroll).toContain("scroll-margin-bottom: 46px;");
	});

	it("generates colored due badge styles with CalendarStar and Alarm SVG masks", () => {
		const css = mobileTentapEditorCss(false);
		const baseBadge = cssBlock(css, '.ProseMirror a[href^="tolaria://due"]');
		const iconBefore = cssBlock(
			css,
			'.ProseMirror a[href^="tolaria://due"]::before',
		);
		const timeBefore = cssBlock(
			css,
			'.ProseMirror a[href^="tolaria://due"] .tolaria-due-time::before',
		);
		const overdueBadge = cssBlock(
			css,
			'.ProseMirror a[href^="tolaria://due"].tolaria-due-overdue',
		);

		expect(baseBadge).toContain("background-color: rgba(99, 102, 241, 0.12);");
		expect(iconBefore).toContain('mask: url("data:image/svg+xml,');
		expect(timeBefore).toContain('mask: url("data:image/svg+xml,');
		expect(overdueBadge).toContain(
			"background-color: rgba(239, 68, 68, 0.12);",
		);
	});
});

function cssBlock(css: string, selector: string): string {
	const opening = `    ${selector} {\n`;
	const start = css.indexOf(opening);
	if (start === -1) return "";

	const bodyStart = start + opening.length;
	const end = css.indexOf("\n    }", bodyStart);
	return end === -1 ? "" : css.slice(bodyStart, end);
}
