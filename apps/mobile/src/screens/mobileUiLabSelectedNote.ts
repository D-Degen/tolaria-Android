import type { MobileWorkspaceSnapshot } from "../workspace/mobileWorkspaceModel";

export function requestedSelectedNoteId(searchParams: URLSearchParams) {
	const value =
		searchParams.get("selectedNoteId") ?? searchParams.get("noteId");
	const trimmed = value?.trim();
	return trimmed || null;
}

export function mobileSnapshotWithRequestedSelectedNote(
	snapshot: MobileWorkspaceSnapshot,
	noteId: string | null,
): MobileWorkspaceSnapshot {
	if (!noteId) return snapshot;
	const matchedId = findMatchingNoteId(snapshot, noteId);
	if (!matchedId) return snapshot;

	return {
		...snapshot,
		selectedNoteId: matchedId,
	};
}

function findMatchingNoteId(
	snapshot: MobileWorkspaceSnapshot,
	noteId: string,
): string | null {
	const notes = snapshot.allNotes ?? snapshot.notes;
	const match = notes.find(
		(note) =>
			note.id === noteId ||
			note.id === `${noteId}.md` ||
			`${note.id}.md` === noteId,
	);
	return match?.id ?? null;
}
