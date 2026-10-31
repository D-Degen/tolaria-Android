import {
	type MobilePropertyValueKind,
	mobilePropertyValueKindForKey,
	mobilePropertyValueTextForKindChange,
} from "../workspace/mobilePropertyValues";
import type { MobileWorkspaceEdit } from "../workspace/mobileWorkspaceEditing";
import type {
	MobileNote,
	MobilePropertyValue,
	MobileWorkspaceSnapshot,
} from "../workspace/mobileWorkspaceModel";
import { workspaceActionOpener } from "./tabletWorkspaceActionForms";
import type {
	ApplyWorkspaceEdit,
	ReadOnlyFormUpdater,
	SaveSelectedEdit,
	SetOpenAction,
} from "./tabletWorkspaceController.types";
import {
	removeNoteIconEdit,
	setNoteIconEditFromForm,
} from "./tabletWorkspaceNoteIconActions";
import {
	changeNoteTypeEditFromForm,
	moveNoteToFolderEditFromForm,
	renameNoteFileEditFromForm,
	renameNoteFileToTitleEdit,
} from "./tabletWorkspaceNoteRetargetActions";
import {
	deletePropertyEdit,
	editPropertyFields,
	propertyEditFromForm,
} from "./tabletWorkspacePropertyActions";
import {
	addRelationshipEditFromForm,
	createRelationshipTargetEditFromForm,
	removeRelationshipEdit,
} from "./tabletWorkspaceRelationshipActions";
import type { TabletReadOnlyForm } from "./tabletWorkspaceTypes";

export function propertyWorkspaceActions({
	applyEdit,
	closeAction,
	readOnlyForm,
	saveSelectedEdit,
	setOpenAction,
	updateReadOnlyForm,
	workspaceSnapshot,
}: {
	applyEdit: ApplyWorkspaceEdit;
	closeAction: () => void;
	readOnlyForm: TabletReadOnlyForm;
	saveSelectedEdit: SaveSelectedEdit;
	setOpenAction: SetOpenAction;
	updateReadOnlyForm: ReadOnlyFormUpdater;
	workspaceSnapshot: MobileWorkspaceSnapshot;
}) {
	const openAction = workspaceActionOpener({
		setOpenAction,
		updateReadOnlyForm,
	});

	return {
		onDeleteProperty: (noteId: string, key: string) => {
			const edit = deletePropertyEdit(noteId, key);
			if (!edit) return;
			applyEdit(edit);
			closeAction();
		},
		onInitializeProperties: (noteId: string) => {
			applyEdit({
				key: "type",
				noteId,
				type: "updateProperty",
				value: "Note",
			});
		},
		onEditProperty: (
			_noteId: string,
			key: string,
			value: MobilePropertyValue,
		) => {
			openAction(
				"editProperty",
				editPropertyFields(
					key,
					value,
					workspaceSnapshot.vaultConfig?.propertyDisplayModes,
				),
			);
		},
		onPropertyNameChange: (value: TabletReadOnlyForm["propertyName"]) => {
			updateReadOnlyForm("propertyName", value);
			updateReadOnlyForm(
				"propertyValueKind",
				mobilePropertyValueKindForKey(
					value,
					readOnlyForm.propertyValueKind,
					workspaceSnapshot.vaultConfig?.propertyDisplayModes,
				),
			);
		},
		onPropertyValueChange: (value: TabletReadOnlyForm["propertyValue"]) =>
			updateReadOnlyForm("propertyValue", value),
		onPropertyValueKindChange: (value: MobilePropertyValueKind) => {
			updateReadOnlyForm("propertyValueKind", value);
			updateReadOnlyForm(
				"propertyValue",
				mobilePropertyValueTextForKindChange(readOnlyForm.propertyValue, value),
			);
		},
		onSaveProperty: () =>
			saveSelectedEdit((noteId) => propertyEdit(readOnlyForm, noteId)),
	};
}

export function relationshipWorkspaceActions({
	applyEdit,
	closeAction,
	readOnlyForm,
	saveSelectedEdit,
	selectedNote,
	updateReadOnlyForm,
}: {
	applyEdit: ApplyWorkspaceEdit;
	closeAction: () => void;
	readOnlyForm: TabletReadOnlyForm;
	saveSelectedEdit: SaveSelectedEdit;
	selectedNote: MobileNote | null;
	updateReadOnlyForm: ReadOnlyFormUpdater;
}) {
	return {
		onCreateRelationshipTarget: () =>
			createRelationshipTarget({
				applyEdit,
				closeAction,
				form: readOnlyForm,
				selectedNote,
			}),
		onRelationshipNameChange: (value: TabletReadOnlyForm["relationshipName"]) =>
			updateReadOnlyForm("relationshipName", value),
		onRelationshipNoteSelect: (title: string, ref: string) => {
			updateReadOnlyForm("relationshipNoteTitle", title);
			updateReadOnlyForm("relationshipNoteRef", ref);
		},
		onRelationshipNoteTitleChange: (
			value: TabletReadOnlyForm["relationshipNoteTitle"],
		) => {
			updateReadOnlyForm("relationshipNoteTitle", value);
			updateReadOnlyForm("relationshipNoteRef", "");
		},
		onRemoveRelationship: (noteId: string, key: string, ref: string) => {
			const edit = removeRelationshipEdit(noteId, key, ref);
			if (edit) applyEdit(edit);
		},
		onSaveRelationship: () =>
			saveSelectedEdit((noteId) => relationshipEdit(readOnlyForm, noteId)),
	};
}

export function retargetWorkspaceActions({
	readOnlyForm,
	saveSelectedEdit,
	selectedNote,
	updateReadOnlyForm,
}: {
	readOnlyForm: TabletReadOnlyForm;
	saveSelectedEdit: SaveSelectedEdit;
	selectedNote: MobileNote | null;
	updateReadOnlyForm: ReadOnlyFormUpdater;
}) {
	return {
		onChangeNoteType: (typeOverride?: string) =>
			saveSelectedEdit((noteId) =>
				changeNoteTypeEditFromForm(
					typeOverride !== undefined
						? { ...readOnlyForm, noteType: typeOverride }
						: readOnlyForm,
					readOnlyForm.targetNoteId || noteId,
				),
			),
		onChangeNoteTypeInputChange: (value: TabletReadOnlyForm["noteType"]) =>
			updateReadOnlyForm("noteType", value),
		onFilenameStemChange: (value: TabletReadOnlyForm["filenameStem"]) =>
			updateReadOnlyForm("filenameStem", value),
		onFolderPathChange: (value: TabletReadOnlyForm["folderPath"]) =>
			updateReadOnlyForm("folderPath", value),
		onMoveNoteToFolder: () =>
			saveSelectedEdit((noteId) =>
				moveNoteToFolderEditFromForm(readOnlyForm, noteId),
			),
		onRenameNoteFile: () =>
			saveSelectedEdit((noteId) =>
				renameNoteFileEditFromForm(readOnlyForm, noteId),
			),
		onRenameNoteFileToTitle: () => {
			const edit = renameNoteFileToTitleEdit(selectedNote);
			if (!edit) return;
			saveSelectedEdit(() => edit);
		},
	};
}

export function noteIconWorkspaceActions({
	readOnlyForm,
	saveSelectedEdit,
	updateReadOnlyForm,
}: {
	readOnlyForm: TabletReadOnlyForm;
	saveSelectedEdit: SaveSelectedEdit;
	updateReadOnlyForm: ReadOnlyFormUpdater;
}) {
	return {
		onNoteIconChange: (value: TabletReadOnlyForm["noteIcon"]) =>
			updateReadOnlyForm("noteIcon", value),
		onRemoveNoteIcon: () => saveSelectedEdit(removeNoteIconEdit),
		onSetNoteIcon: () =>
			saveSelectedEdit((noteId) =>
				setNoteIconEditFromForm(readOnlyForm, noteId),
			),
	};
}

export function createRelationshipTarget({
	applyEdit,
	closeAction,
	form,
	selectedNote,
}: {
	applyEdit: ApplyWorkspaceEdit;
	closeAction: () => void;
	form: TabletReadOnlyForm;
	selectedNote: MobileNote | null;
}) {
	const edit = createRelationshipTargetEditFromForm(form, selectedNote);
	if (!edit) return;

	applyEdit(edit);
	closeAction();
}

export function propertyEdit(
	form: TabletReadOnlyForm,
	noteId: string,
): MobileWorkspaceEdit | null {
	return propertyEditFromForm(form, noteId);
}

export function relationshipEdit(
	form: TabletReadOnlyForm,
	noteId: string,
): MobileWorkspaceEdit | null {
	return addRelationshipEditFromForm(form, noteId);
}
