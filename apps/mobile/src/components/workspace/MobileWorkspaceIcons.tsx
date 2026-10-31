import { StyleSheet } from "react-native";
import { useMobileColors } from "../../ui/theme/useMobileTheme";
import type {
	MobileFileKind,
	MobileTone,
	MobileTypeDefinitions,
} from "../../workspace/mobileWorkspaceModel";
import { Text } from "../ui/text";
import {
	mobileTypeConfiguredIcon,
	mobileTypeIconCandidates,
} from "./MobileWorkspaceIconNames";
import {
	mobilePhosphorIconElement,
	requiredMobilePhosphorIcon,
} from "./MobileWorkspaceIconResolver";
import { noteTypeColor } from "./mobileWorkspaceTone";

export function MobileTypeIcon({
	size,
	tone,
	type,
	typeDefinitions,
	fileKind,
}: {
	fileKind?: MobileFileKind;
	size: number;
	tone: MobileTone;
	type: string;
	typeDefinitions: MobileTypeDefinitions | null | undefined;
}) {
	const colors = useMobileColors();
	const color = noteTypeColor(tone, colors);

	if (fileKind === "binary") {
		return <FileDashedIcon color={color} size={size} />;
	}

	if (fileKind === "text") {
		return <FileTextIcon color={color} size={size} />;
	}

	for (const icon of mobileTypeIconCandidates(
		type,
		mobileTypeConfiguredIcon(type, typeDefinitions),
	)) {
		const iconElement = mobilePhosphorIconElement(icon, { color, size });
		if (iconElement) return iconElement;
	}

	return <FileTextIcon color={color} size={size} />;
}

export function MobileNoteIcon({
	color,
	icon,
	size,
	testID,
}: {
	color: string;
	icon: string | null | undefined;
	size: number;
	testID?: string;
}) {
	const trimmedIcon = icon?.trim();
	if (!trimmedIcon) return null;

	if (isRemoteIcon(trimmedIcon))
		return <FileTextIcon color={color} size={size} testID={testID} />;

	if (trimmedIcon === "📅" || trimmedIcon === "🗓️") {
		return mobilePhosphorIconElement("calendarstar", { color, size, testID });
	}
	if (trimmedIcon === "⏰" || trimmedIcon === "⏱️") {
		return mobilePhosphorIconElement("alarm", { color, size, testID });
	}

	const iconElement = mobileNoteIconElement(trimmedIcon, {
		color,
		size,
		testID,
	});
	if (iconElement) return iconElement;

	return (
		<Text
			numberOfLines={1}
			style={[
				styles.noteIconText,
				{ color, fontSize: size, lineHeight: size + 2 },
			]}
			testID={testID}
		>
			{trimmedIcon}
		</Text>
	);
}

function mobileNoteIconElement(
	icon: string,
	props: {
		color: string;
		size: number;
		testID?: string;
	},
) {
	return mobilePhosphorIconElement(icon, props);
}

function isRemoteIcon(value: string) {
	return /^https?:\/\//iu.test(value);
}

const FileTextIcon = requiredMobilePhosphorIcon("filetext");
const FileDashedIcon = requiredMobilePhosphorIcon("filedashed");

const styles = StyleSheet.create({
	noteIconText: {
		flexShrink: 0,
		minWidth: 0,
	},
});
