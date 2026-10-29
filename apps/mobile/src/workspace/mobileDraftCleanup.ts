import type { MobileNote } from "./mobileWorkspaceModel";

/**
 * Returns true if a draft note path or id still has a generic untitled filename
 * (e.g. untitled-note-1740000000.md, folders/untitled-project-1740000000.md).
 */
export function isGenericDraftPath(idOrPath: string | null | undefined): boolean {
	const clean = (idOrPath ?? "").trim();
	if (clean.length === 0) return true;
	const filename = clean.split("/").filter(Boolean).at(-1) ?? clean;
	return /^untit(le|el)d(?:\b|[-_])/i.test(filename);
}

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
			/untit(le|el)d note/i.test(cleanTitle) ||
			/^ohne titel/i.test(cleanTitle) ||
			/^neue notiz/i.test(cleanTitle)
		);
	}

	return isGenericDraftPath(cleanId);
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
	contentOverride?: string | null,
): boolean {
	if (!note) return false;

	const isGeneric = isGenericDraftTitle(note.title, note.id);
	if (!isGeneric) return false;

	const content = (contentOverride ?? note.rawContent ?? "").trim();
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

export type DraftLeaveAction =
	| { noteId: string; type: "delete" }
	| { noteId: string; title: string; type: "rename" }
	| { type: "none" };

/**
 * Determines whether a draft note should be deleted (if empty) or renamed
 * to its first heading/title when leaving the editor.
 */
export function resolveDraftLeaveAction(
	note: MobileNote | null | undefined,
	contentOverride?: string | null,
): DraftLeaveAction {
	if (!note) return { type: "none" };

	if (isDiscardableEmptyDraft(note, contentOverride)) {
		return { noteId: note.id, type: "delete" };
	}

	const hasGenericTitleOrPath =
		isGenericDraftTitle(note.title, note.id) ||
		isGenericDraftPath(note.path ?? note.id);

	if (hasGenericTitleOrPath) {
		const raw = contentOverride ?? note.rawContent ?? "";
		const candidateTitle =
			extractFirstTitleFromMarkdown(raw) ??
			(!isGenericDraftTitle(note.title) ? note.title.trim() : null);
		if (candidateTitle && !isGenericDraftTitle(candidateTitle)) {
			return {
				noteId: note.id,
				title: candidateTitle,
				type: "rename",
			};
		}
	}

	return { type: "none" };
}
