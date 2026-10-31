import { Check } from "phosphor-react-native";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { MobileChip } from "../../ui/MobileChip";
import type { MobileMetrics } from "../../ui/mobileMetrics";
import type { MobileColors } from "../../ui/theme/mobilePalette";
import { useMobileStyles } from "../../ui/theme/useMobileTheme";
import { chipTone } from "../../workspace/mobileNoteDisplay";
import type {
	MobileNote,
	MobileTypeDefinitions,
} from "../../workspace/mobileWorkspaceModel";
import { Button } from "../ui/button";
import { Text } from "../ui/text";
import { MobileTypeIcon } from "./MobileWorkspaceIcons";
import { collectAvailableNoteTypes } from "./MobileWorkspaceTypePickerModel";

export type MobileWorkspaceTypePickerProps = {
	notes: MobileNote[];
	selectedNote: MobileNote | null;
	targetNoteId?: string;
	typeDefinitions?: MobileTypeDefinitions;
	onChangeNoteType: (typeOverride?: string) => void;
	onChangeNoteTypeInputChange: (value: string) => void;
	onClose: () => void;
};

export function MobileWorkspaceTypePicker({
	notes,
	selectedNote,
	targetNoteId,
	typeDefinitions,
	onChangeNoteType,
	onChangeNoteTypeInputChange,
	onClose,
}: MobileWorkspaceTypePickerProps) {
	const { styles, colors } = useMobileStyles(createTypePickerStyles);
	const availableTypes = useMemo(
		() => collectAvailableNoteTypes(typeDefinitions, notes),
		[typeDefinitions, notes],
	);
	const activeNote = (targetNoteId ? notes.find((n) => n.id === targetNoteId) : null) ?? selectedNote;
	const currentType = activeNote?.type?.trim().toLowerCase();

	return (
		<ScrollView
			contentContainerStyle={styles.content}
			keyboardShouldPersistTaps="handled"
			style={styles.scrollArea}
			testID="workspace-change-type-list"
		>
			<View style={styles.list}>
				{availableTypes.map((item) => {
					const isSelected = item.typeName.trim().toLowerCase() === currentType;
					return (
						<Button
							accessibilityLabel={item.typeName}
							accessibilityRole="button"
							accessibilityState={{ selected: isSelected }}
							key={item.typeName}
							onPress={() => {
								onChangeNoteTypeInputChange(item.typeName);
								onChangeNoteType(item.typeName);
								onClose();
							}}
							style={styles.row}
							testID={`workspace-change-type-option-${item.typeName}`}
							variant="ghost"
						>
							<View style={styles.iconContainer}>
								<MobileTypeIcon
									size={20}
									tone={item.tone}
									type={item.typeName}
									typeDefinitions={typeDefinitions}
								/>
							</View>
							<Text numberOfLines={1} style={styles.label}>
								{item.typeName}
							</Text>
							<View style={styles.trailing}>
								<MobileChip
									density="list"
									label={item.typeName}
									tone={chipTone(item.tone)}
								/>
								{isSelected ? (
									<Check color={colors.primary} size={18} weight="bold" />
								) : null}
							</View>
						</Button>
					);
				})}
			</View>
		</ScrollView>
	);
}

function createTypePickerStyles(colors: MobileColors, metrics: MobileMetrics) {
	const { space, type } = metrics;
	const rowHeight = Math.max(48, metrics.size(44));
	return {
		colors,
		styles: StyleSheet.create({
			content: {
				paddingHorizontal: space.md,
				paddingVertical: space.sm,
			},
			iconContainer: {
				alignItems: "center",
				justifyContent: "center",
				marginRight: space.sm,
				width: 24,
			},
			label: {
				color: colors.text,
				flex: 1,
				fontSize: type.body,
				fontWeight: "500",
			},
			list: {
				flexDirection: "column",
				gap: space.xs,
			},
			row: {
				alignItems: "center",
				borderRadius: 6,
				flexDirection: "row",
				height: rowHeight,
				justifyContent: "space-between",
				paddingHorizontal: space.sm,
				width: "100%",
			},
			scrollArea: {
				maxHeight: 380,
			},
			trailing: {
				alignItems: "center",
				flexDirection: "row",
				gap: space.sm,
			},
		}),
	};
}
