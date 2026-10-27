import type { MobileNote } from "./mobileWorkspaceModel";

/**
 * Returns true if a draft title or id is generic (e.g. Untitled Note, untiteld, untitled-note-...)
 */
export function isGenericDraftTitle(
	title: string | null | undefined,
	id?: string | null,
): boolean {
	const cleanTitle = (title ?? "").trim();
	const cleanId = (id ?? "").trim();

	if (cleanTitle.length > 0) {
		return (
			/^untit(le|el)d/i.test(cleanTitle) ||
			/untit(le|el)d note/i.test(cleanTitle)
		);
	}

	return (
		cleanId.length === 0 ||
		/^untit(le|el)d/i.test(cleanId) ||
		/untit(le|el)d-note-/i.test(cleanId)
	);
}

/**
 * Extracts the first user-entered title from markdown content, or null if none or generic.
 */
export function extractFirstTitleFromMarkdown(content: string): string | null {
	if (!content?.trim()) return null;
	const withoutFrontmatter = content
		.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
		.trim();
	if (!withoutFrontmatter) return null;

	// Check first H1 heading: # Heading
	const h1Match = withoutFrontmatter.match(/^#\s+([^\r\n]+)/m);
	if (h1Match?.[1]?.trim()) {
		const title = h1Match[1].trim();
		if (!isGenericDraftTitle(title)) return title;
	}

	// Fallback: check first non-empty line if not markdown block or quote
	const firstLine = withoutFrontmatter
		.split(/\r?\n/)
		.map((line) => line.trim())
		.find((line) => line.length > 0);
	if (firstLine && !firstLine.startsWith("```") && !firstLine.startsWith(">")) {
		const clean = firstLine
			.replace(/^#+\s*/, "")
			.replace(/^[-*+]\s+/, "")
			.trim();
		if (clean && !isGenericDraftTitle(clean)) return clean;
	}

	return null;
}

/**
 * Returns true if a draft note has neither a user-assigned title nor body content.
 */
export function isDiscardableEmptyDraft(
	note: MobileNote | null | undefined,
): boolean {
	if (!note) return false;

	const isGeneric = isGenericDraftTitle(note.title, note.id);
	if (!isGeneric) return false;

	const content = (note.rawContent ?? "").trim();
	if (!content) return true;

	// Strip YAML frontmatter block if present
	const withoutFrontmatter = content
		.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
		.trim();

	// Strip empty markdown headings (#, ##, etc.) and blank lines
	const cleanBody = withoutFrontmatter
		.split(/\r?\n/)
		.filter((line) => {
			const trimmed = line.trim();
			return trimmed.length > 0 && !/^#+\s*$/.test(trimmed);
		})
		.join("\n")
		.trim();

	return cleanBody.length === 0;
}
