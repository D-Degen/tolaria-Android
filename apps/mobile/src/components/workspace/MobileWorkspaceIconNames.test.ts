import { describe, expect, it } from "vitest";
import {
	mobileTypeIconCandidates,
	normalizeIconKey,
} from "./MobileWorkspaceIconNames";

describe("mobile type icon names", () => {
	it("prefers the configured vault type icon before semantic fallbacks", () => {
		expect(mobileTypeIconCandidates("Journal", "book-bookmark")).toEqual([
			"book-bookmark",
			"Journal",
		]);
		expect(mobileTypeIconCandidates("Quarter", "calendar-blank")).toEqual([
			"calendar-blank",
			"Quarter",
		]);
	});

	it("keeps real Laputa configured Phosphor icon names as first candidates", () => {
		expect(mobileTypeIconCandidates("Evergreen", "leaf")[0]).toBe("leaf");
		expect(mobileTypeIconCandidates("Restaurant", "brain")[0]).toBe("brain");
		expect(mobileTypeIconCandidates("Health", "stethoscope")[0]).toBe(
			"stethoscope",
		);
		expect(mobileTypeIconCandidates("Music", "guitar")[0]).toBe("guitar");
		expect(mobileTypeIconCandidates("Note", "file-text")[0]).toBe("file-text");
	});

	it("keeps semantic desktop parity fallbacks for types without configured icons", () => {
		expect(mobileTypeIconCandidates("Procedure", null)).toEqual([
			"stacksimple",
			"Procedure",
		]);
		expect(mobileTypeIconCandidates("Project", "")).toEqual([
			"folderopen",
			"Project",
		]);
		expect(mobileTypeIconCandidates("Kalender", null)).toEqual([
			"calendarstar",
			"Kalender",
		]);
		expect(mobileTypeIconCandidates("Uhrzeit", null)).toEqual([
			"alarm",
			"Uhrzeit",
		]);
	});

	it("normalizes desktop-style phosphor icon names for resolver lookup", () => {
		expect(normalizeIconKey("book-bookmark")).toBe("bookbookmark");
		expect(normalizeIconKey("Calendar Blank")).toBe("calendarblank");
	});
});
