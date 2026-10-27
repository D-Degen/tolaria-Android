import type {
	MobileNote,
	MobileTone,
	MobileTypeDefinitions,
} from "../../workspace/mobileWorkspaceModel";
import { mobileWorkspaceTypeTone } from "../../workspace/mobileWorkspaceTypeTone";

export type AvailableNoteType = {
	typeName: string;
	tone: MobileTone;
};

export function collectAvailableNoteTypes(
	typeDefinitions: MobileTypeDefinitions | undefined,
	notes: MobileNote[],
): AvailableNoteType[] {
	const typesMap = new Map<string, { typeName: string; tone: MobileTone }>();

	if (typeDefinitions) {
		for (const [typeName, def] of Object.entries(typeDefinitions)) {
			if (!typeName.trim()) continue;
			typesMap.set(typeName, {
				tone:
					def.tone ??
					mobileWorkspaceTypeTone(typeName, typeDefinitions, "gray"),
				typeName,
			});
		}
	}

	for (const note of notes) {
		const typeName = note.type?.trim();
		if (typeName && !typesMap.has(typeName)) {
			typesMap.set(typeName, {
				tone:
					note.typeTone ??
					mobileWorkspaceTypeTone(typeName, typeDefinitions, "gray"),
				typeName,
			});
		}
	}

	const defaultTypes = [
		"Note",
		"Procedure",
		"Project",
		"Person",
		"Topic",
		"Event",
		"Experiment",
	];
	for (const defType of defaultTypes) {
		if (!typesMap.has(defType)) {
			typesMap.set(defType, {
				tone: mobileWorkspaceTypeTone(defType, typeDefinitions, "gray"),
				typeName: defType,
			});
		}
	}

	return Array.from(typesMap.values()).sort((a, b) => {
		const orderA = typeDefinitions?.[a.typeName]?.order ?? 999;
		const orderB = typeDefinitions?.[b.typeName]?.order ?? 999;
		if (orderA !== orderB) return orderA - orderB;
		return a.typeName.localeCompare(b.typeName);
	});
}
