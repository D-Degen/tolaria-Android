import type { MobileNote } from "./mobileWorkspaceModel";

/**
 * Returns true if a draft note has neither a user-assigned title nor body content.
 */
export function isDiscardableEmptyDraft(
	note: MobileNote | null | undefined,
): boolean {
	if (!note) return false;

	const title = (note.title ?? "").trim();
	const isUntitled =
		title.length === 0 ||
		title.startsWith("Untitled Note") ||
		title.startsWith("Untitled ") ||
		title === "Untitled" ||
		(/^untitled-/i.test(note.id) &&
			(/^untitled/i.test(title) || title.length === 0));

	if (!isUntitled) return false;

	const content = (note.rawContent ?? "").trim();
	if (!content) return true;

	// Strip YAML frontmatter block if present
	const withoutFrontmatter = content
		.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
		.trim();
	return withoutFrontmatter.length === 0;
}
