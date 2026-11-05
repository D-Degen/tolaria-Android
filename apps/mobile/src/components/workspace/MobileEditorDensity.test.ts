import { describe, expect, it } from "vitest";
import { mobileMetrics } from "../../ui/mobileMetrics";
import { mobilePalettes } from "../../ui/theme/mobilePalette";
import { mobileTentapEditorCss } from "./MobileWysiwygMarkdownEditorCss";

describe("rich editor density", () => {
	it("uses the same larger text and spacing as native chrome without scaling borders or width", () => {
		const css = mobileTentapEditorCss(
			false,
			null,
			mobilePalettes.light,
			mobileMetrics[1.2],
		);
		expect(css).toContain("font-size: 18px;");
		expect(css).toContain("line-height: 27.6px;");
		expect(css).toContain("padding: 24px 48px 192px;");
		expect(css).toContain("max-width: 820px;");
		expect(css).toContain("border-bottom: 1px solid");
	});
});
