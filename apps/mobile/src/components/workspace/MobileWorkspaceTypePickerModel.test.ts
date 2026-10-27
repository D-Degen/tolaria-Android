import { describe, expect, it } from "vitest";
import type {
	MobileNote,
	MobileTypeDefinitions,
} from "../../workspace/mobileWorkspaceModel";
import { collectAvailableNoteTypes } from "./MobileWorkspaceTypePickerModel";

function createTestNote(
	type: string,
	typeTone: MobileNote["typeTone"] = "gray",
): MobileNote {
	return {
		created: "now",
		date: "2026-10-27",
		favorite: false,
		id: `${type.toLowerCase()}.md`,
		links: 0,
		modified: "now",
		outgoingLinks: [],
		path: `${type.toLowerCase()}.md`,
		relationships: [],
		snippet: "",
		status: "",
		tags: [],
		title: type,
		type,
		typeTone,
		workspace: "Test",
	};
}

describe("collectAvailableNoteTypes", () => {
	it("collects types from typeDefinitions with configured order and tone", () => {
		const typeDefinitions: MobileTypeDefinitions = {
			Procedure: { order: 1, tone: "purple" },
			Project: { order: 2, tone: "red" },
		};
		const notes: MobileNote[] = [];
		const types = collectAvailableNoteTypes(typeDefinitions, notes);

		expect(types[0]).toEqual({ tone: "purple", typeName: "Procedure" });
		expect(types[1]).toEqual({ tone: "red", typeName: "Project" });
	});

	it("includes note types present in notes", () => {
		const notes = [createTestNote("CustomType", "yellow")];
		const types = collectAvailableNoteTypes(undefined, notes);
		const found = types.find((t) => t.typeName === "CustomType");
		expect(found).toBeDefined();
		expect(found?.tone).toBe("yellow");
	});

	it("includes default types when typeDefinitions is empty", () => {
		const types = collectAvailableNoteTypes(undefined, []);
		const typeNames = types.map((t) => t.typeName);
		expect(typeNames).toContain("Note");
		expect(typeNames).toContain("Procedure");
		expect(typeNames).toContain("Project");
	});
});
