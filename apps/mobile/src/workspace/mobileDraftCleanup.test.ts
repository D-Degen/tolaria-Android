import { describe, expect, it } from "vitest";
import { isDiscardableEmptyDraft } from "./mobileDraftCleanup";
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

describe("isDiscardableEmptyDraft", () => {
	it("returns false for null or undefined note", () => {
		expect(isDiscardableEmptyDraft(null)).toBe(false);
		expect(isDiscardableEmptyDraft(undefined)).toBe(false);
	});

	it("returns true when note has default untitled title and empty content", () => {
		const note = createTestNote({
			id: "untitled-note-12345.md",
			title: "Untitled Note 12345",
			rawContent: "---\ntype: Note\n---\n",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(true);
	});

	it("returns true when note has completely empty rawContent and empty title", () => {
		const note = createTestNote({
			id: "untitled-note-999.md",
			title: "",
			rawContent: "",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(true);
	});

	it("returns false when note has user-assigned title", () => {
		const note = createTestNote({
			id: "untitled-note-12345.md",
			title: "My Project Plan",
			rawContent: "---\ntype: Note\n---\n",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(false);
	});

	it("returns false when note has user-written body content", () => {
		const note = createTestNote({
			id: "untitled-note-12345.md",
			title: "Untitled Note 12345",
			rawContent: "---\ntype: Note\n---\nHello world note text",
		});
		expect(isDiscardableEmptyDraft(note)).toBe(false);
	});
});
