import {
	extractFirstTitleFromMarkdown,
	isGenericDraftTitle,
} from "../workspace/mobileDraftCleanup";
import { mobileNoteActionMode } from "../workspace/mobileNoteActionMode";
import {
	mobileFilenameStemForTitle,
	validateMobileRenameNoteFilePath,
} from "../workspace/mobileNotePaths";
import { toggleMobileNoteWidth } from "../workspace/mobileNoteWidth";
import type { MobileWorkspaceEdit } from "../workspace/mobileWorkspaceEditing";
import type {
	MobileNote,
	MobileNoteWidth,
	MobileWorkspaceSnapshot,
} from "../workspace/mobileWorkspaceModel";

type BulkEdit = Extract<MobileWorkspaceEdit, { type: "bulkEdit" }>;
type DeleteNoteEdit = Extract<MobileWorkspaceEdit, { type: "deleteNote" }>;
type SetArchivedEdit = Extract<MobileWorkspaceEdit, { type: "setArchived" }>;
type SetDefaultNoteWidthEdit = Extract<
	MobileWorkspaceEdit,
	{ type: "setDefaultNoteWidth" }
>;
type SetOrganizedEdit = Extract<MobileWorkspaceEdit, { type: "setOrganized" }>;
type ToggleFavoriteEdit = Extract<
	MobileWorkspaceEdit,
	{ type: "toggleFavorite" }
>;
type UpdateContentEdit = Extract<
	MobileWorkspaceEdit,
	{ type: "updateNoteContent" | "updateTextFileContent" }
>;
type UpdatePropertyEdit = Extract<
	MobileWorkspaceEdit,
	{ type: "updateProperty" }
>;

export type EditorContentUpdateEdit = UpdateContentEdit | BulkEdit;

export function deleteSelectedNoteEdit(
	note: MobileNote | null,
): DeleteNoteEdit | null {
	return note ? { noteId: note.id, type: "deleteNote" } : null;
}

export function setArchivedEdit(
	note: MobileNote | null,
	archived: boolean,
): SetArchivedEdit | null {
	return note ? { archived, noteId: note.id, type: "setArchived" } : null;
}

export function setDefaultNoteWidthEdit(
	mode: MobileNoteWidth,
): SetDefaultNoteWidthEdit {
	return { mode, type: "setDefaultNoteWidth" };
}

export function setOrganizedEdit(
	note: MobileNote | null,
	organized: boolean,
): SetOrganizedEdit | null {
	return note ? { noteId: note.id, organized, type: "setOrganized" } : null;
}

export function toggleFavoriteEdit(
	note: MobileNote | null,
): ToggleFavoriteEdit | null {
	return note ? { noteId: note.id, type: "toggleFavorite" } : null;
}

export function toggleNoteWidthEdit(
	note: MobileNote | null,
): UpdatePropertyEdit | null {
	if (!note) return null;

	return {
		key: "_width",
		noteId: note.id,
		type: "updateProperty",
		value: toggleMobileNoteWidth(note.noteWidth),
	};
}

export function editorContentUpdateEdit(
	snapshot: MobileWorkspaceSnapshot,
	noteId: string,
	content: string,
): EditorContentUpdateEdit | null {
	const trimmedNoteId = noteId.trim();
	if (!trimmedNoteId) return null;

	const note = workspaceNotes(snapshot).find(
		(candidate) => candidate.id === trimmedNoteId,
	);
	if (!note) return null;

	if (mobileNoteActionMode(note) === "text-file") {
		return { content, noteId: trimmedNoteId, type: "updateTextFileContent" };
	}

	const updateEdit: Extract<
		MobileWorkspaceEdit,
		{ type: "updateNoteContent" }
	> = {
		content,
		noteId: trimmedNoteId,
		type: "updateNoteContent",
	};

	// If the note currently has a generic/untitled title or id, automatically rename the file to the first user-entered title
	if (isGenericDraftTitle(note.title, note.id)) {
		const candidateTitle = extractFirstTitleFromMarkdown(content);
		if (candidateTitle && !isGenericDraftTitle(candidateTitle)) {
			const filenameStem = mobileFilenameStemForTitle(candidateTitle);
			if (filenameStem && filenameStem !== "untitled") {
				const status = validateMobileRenameNoteFilePath({
					filenameStem,
					note,
					notes: workspaceNotes(snapshot),
				});
				if (status === "ok") {
					return {
						edits: [
							updateEdit,
							{ filenameStem, noteId: trimmedNoteId, type: "renameNoteFile" },
						],
						type: "bulkEdit",
					};
				}
			}
		}
	}

	return updateEdit;
}

function workspaceNotes(snapshot: MobileWorkspaceSnapshot): MobileNote[] {
	return snapshot.allNotes ?? snapshot.notes;
}
