import type { MobileTypeDefinitions } from "../../workspace/mobileWorkspaceModel";

export function mobileTypeConfiguredIcon(
	type: string,
	typeDefinitions: MobileTypeDefinitions | null | undefined,
): string | null {
	return typeDefinitions?.[type]?.icon ?? null;
}

export function mobileTypeIconCandidates(
	type: string,
	configuredIcon?: string | null,
): string[] {
	return uniqueIconCandidates([
		trimmedIconName(configuredIcon),
		semanticTypeIconKey(normalizeIconKey(type)),
		trimmedIconName(type),
	]);
}

export function normalizeIconKey(
	value: string | null | undefined,
): string | null {
	const normalized = value
		?.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, "");
	return normalized || null;
}

function semanticTypeIconKey(normalizedType: string | null): string | null {
	if (!normalizedType) return null;
	if (normalizedType.includes("release")) return "archive";
	if (normalizedType.includes("procedure")) return "stacksimple";
	if (normalizedType.includes("project")) return "folderopen";
	if (
		normalizedType.includes("calendar") ||
		normalizedType.includes("kalender") ||
		normalizedType.includes("termin")
	) {
		return "calendarstar";
	}
	if (
		normalizedType.includes("alarm") ||
		normalizedType.includes("uhr") ||
		normalizedType.includes("time") ||
		normalizedType.includes("clock")
	) {
		return "alarm";
	}
	return null;
}

function trimmedIconName(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed || null;
}

function uniqueIconCandidates(candidates: Array<string | null>): string[] {
	return candidates.reduce<string[]>((uniqueCandidates, candidate) => {
		if (candidate && !uniqueCandidates.includes(candidate))
			uniqueCandidates.push(candidate);
		return uniqueCandidates;
	}, []);
}
