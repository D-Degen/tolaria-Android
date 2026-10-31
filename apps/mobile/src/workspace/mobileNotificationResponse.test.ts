import { describe, expect, it } from "vitest";
import { extractNotificationTargetNoteId } from "./mobileNotificationResponse";

describe("extractNotificationTargetNoteId", () => {
	it("returns null for null, undefined or empty input", () => {
		expect(extractNotificationTargetNoteId(null)).toBeNull();
		expect(extractNotificationTargetNoteId(undefined)).toBeNull();
		expect(extractNotificationTargetNoteId({})).toBeNull();
	});

	it("extracts noteId directly from content data", () => {
		const response = {
			notification: {
				request: {
					content: {
						data: {
							noteId: "my-project-plan.md",
						},
					},
				},
			},
		};
		expect(extractNotificationTargetNoteId(response)).toBe(
			"my-project-plan.md",
		);
	});

	it("extracts noteId from deep link URL in content data", () => {
		const response = {
			notification: {
				request: {
					content: {
						data: {
							url: "tolaria://open?noteId=notes%2Fshopping-list.md&phoneState=editor",
						},
					},
				},
			},
		};
		expect(extractNotificationTargetNoteId(response)).toBe(
			"notes/shopping-list.md",
		);
	});

	it("prefers direct noteId over url fallback", () => {
		const response = {
			notification: {
				request: {
					content: {
						data: {
							noteId: "primary.md",
							url: "tolaria://open?noteId=fallback.md",
						},
					},
				},
			},
		};
		expect(extractNotificationTargetNoteId(response)).toBe("primary.md");
	});

	it("returns null if noteId or url is missing or empty", () => {
		const response = {
			notification: {
				request: {
					content: {
						data: {
							foo: "bar",
						},
					},
				},
			},
		};
		expect(extractNotificationTargetNoteId(response)).toBeNull();
	});
});
