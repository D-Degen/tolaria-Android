import { describe, expect, it } from "vitest";
import {
	extractFirstTitleFromMarkdown,
	isDiscardableEmptyDraft,
	isGenericDraftTitle,
	resolveDraftLeaveAction,
} from "./mobileDraftCleanup";
import type { MobileNote } from "./mobileWorkspaceModel";

function createTestNote(overrides: Partial<MobileNote> = {}): MobileNote {
	return {
		created: "now",
		date: "2026-10-27",
		favorite: false,
		id: "test-note.md",
		links: 0,
		modified: "now",
		outgoingLinks: [],
		path: "test-note.md",
		rawContent: "",
		relationships: [],
		status: "",
		snippet: "",
		tags: [],
		title: "Untitled Note 12345",
		type: "Note",
		typeTone: "gray",
		workspace: "Test",
		...overrides,
	};
}

describe("isGenericDraftTitle", () => {
	it("detects various generic titles and ids", () => {
		expect(isGenericDraftTitle("")).toBe(true);
		expect(isGenericDraftTitle("Untitled")).toBe(true);
		expect(isGenericDraftTitle("Untitled Note 1730058123")).toBe(true);
		expect(isGenericDraftTitle("Untiteld Note...")).toBe(true);
		expect(
			isGenericDraftTitle("untitled-note-999", "untitled-note-999.md"),
		).toBe(true);
		expect(isGenericDraftTitle("Weekly Review")).toBe(false);
		expect(isGenericDraftTitle("Mein Projekt")).toBe(false);
	});
});

describe("extractFirstTitleFromMarkdown", () => {
	it("extracts non-generic H1 heading", () => {
		const md = "---\ntype: Note\n---\n\n# Einkaufsliste\n\nMilch kaufen";
		expect(extractFirstTitleFromMarkdown(md)).toBe("Einkaufsliste");
	});

	it("ignores generic H1 heading", () => {
		const md = "---\ntype: Note\n---\n\n# Untitled Note 12345\n\n";
		expect(extractFirstTitleFromMarkdown(md)).toBeNull();
	});

	it("extracts first non-empty line if no H1 exists", () => {
		const md = "---\ntype: Note\n---\n\nMeeting Notizen\n\nTeilnehmer: Anna";
		expect(extractFirstTitleFromMarkdown(md)).toBe("Meeting Notizen");
	});

	it("returns null for empty content or only empty heading", () => {
		expect(
			extractFirstTitleFromMarkdown("---\ntype: Note\n---\n\n# \n\n"),
		).toBeNull();
		expect(extractFirstTitleFromMarkdown("")).toBeNull();
	});
});

describe("isDiscardableEmptyDraft", () => {
	it("returns false for null or undefined note", () => {
		expect(isDiscardableEmptyDraft(null)).toBe(false);
		expect(isDiscardableEmptyDraft(undefined)).toBe(false);
	});

	it("returns true when note has default untitled title and empty content", () => {
		const note = createTestNote({
			id: "untitled-note-12345.md",
			rawContent: "---\ntype: Note\n---\n",
			title: "Untitled Note 12345",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(true);
	});

	it("returns true when note has initial template with empty heading", () => {
		const note = createTestNote({
			id: "untitled-note-1740000000.md",
			rawContent: "---\ntype: Note\n---\n\n# \n\n",
			title: "Untitled Note 1740000000",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(true);
	});

	it('returns true when note has typo generic title "Untiteld Note..." and empty content', () => {
		const note = createTestNote({
			id: "untitled-note-999.md",
			rawContent: "---\ntype: Note\n---\n\n# \n\n",
			title: "Untiteld Note...",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(true);
	});

	it("returns true when note has completely empty rawContent and empty title", () => {
		const note = createTestNote({
			id: "untitled-note-999.md",
			rawContent: "",
			title: "",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(true);
	});

	it("returns false when note has user-assigned title", () => {
		const note = createTestNote({
			id: "untitled-note-12345.md",
			rawContent: "---\ntype: Note\n---\n",
			title: "My Project Plan",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(false);
	});

	it("returns false when note has user-written body content", () => {
		const note = createTestNote({
			id: "untitled-note-12345.md",
			rawContent: "---\ntype: Note\n---\nHello world note text",
			title: "Untitled Note 12345",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(false);
	});

	it("returns false when note has user-written heading", () => {
		const note = createTestNote({
			id: "untitled-note-12345.md",
			rawContent: "---\ntype: Note\n---\n\n# Meine neue Notiz\n\n",
			title: "Untitled Note 12345",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(false);
	});
});

describe("resolveDraftLeaveAction", () => {
	it("returns delete for empty draft notes", () => {
		const emptyNote = createTestNote({
			id: "untitled-note-1740000000.md",
			rawContent: "---\ntype: Note\n---\n\n# \n\n",
			title: "Untitled Note 1740000000",
		});
		expect(resolveDraftLeaveAction(emptyNote)).toEqual({
			noteId: emptyNote.id,
			type: "delete",
		});
	});

	it("returns rename for untitled draft with entered heading in content", () => {
		const draftWithHeading = createTestNote({
			id: "untitled-note-1740000000.md",
			rawContent: "---\ntype: Note\n---\n\n# Titel der Notiz\n\nInhalt...",
			title: "Untitled Note 1740000000",
		});
		expect(resolveDraftLeaveAction(draftWithHeading)).toEqual({
			noteId: draftWithHeading.id,
			title: "Titel der Notiz",
			type: "rename",
		});
	});

	it("supports contentOverride for pending unflushed draft content", () => {
		const draftNote = createTestNote({
			id: "untitled-note-1740000000.md",
			rawContent: "---\ntype: Note\n---\n\n# \n\n",
			title: "Untitled Note 1740000000",
		});
		expect(
			resolveDraftLeaveAction(
				draftNote,
				"---\ntype: Note\n---\n\n# Neuer Titel\n\nText",
			),
		).toEqual({
			noteId: draftNote.id,
			title: "Neuer Titel",
			type: "rename",
		});
	});

	it("returns rename when note.title was derived from H1 but path is still untitled-note-...", () => {
		const draftWithDerivedTitle = createTestNote({
			id: "untitled-note-1740000000.md",
			path: "untitled-note-1740000000.md",
			rawContent: "---\ntype: Note\n---\n\n# Titel der Notiz\n\n",
			title: "Titel der Notiz",
		});
		expect(resolveDraftLeaveAction(draftWithDerivedTitle)).toEqual({
			noteId: draftWithDerivedTitle.id,
			title: "Titel der Notiz",
			type: "rename",
		});
	});

	it("returns none for already titled non-generic notes", () => {
		const namedNote = createTestNote({
			id: "projekt-alpha.md",
			rawContent: "# Projekt Alpha\n\nPlan",
			title: "Projekt Alpha",
		});
		expect(resolveDraftLeaveAction(namedNote)).toEqual({
			type: "none",
		});
	});
});
