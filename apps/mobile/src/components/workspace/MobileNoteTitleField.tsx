import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import type { MobileMetrics } from "../../ui/mobileMetrics";
import type { MobileColors } from "../../ui/theme/mobilePalette";
import { useMobileStyles } from "../../ui/theme/useMobileTheme";

type MobileNoteTitleFieldProps = {
	autoFocus?: boolean;
	initialTitle: string;
	noteId: string;
	onSubmitTitle: (title: string) => void;
};

export function MobileNoteTitleField({
	autoFocus = false,
	initialTitle,
	noteId,
	onSubmitTitle,
}: MobileNoteTitleFieldProps) {
	const [title, setTitle] = useState(initialTitle);
	const [lastNoteId, setLastNoteId] = useState(noteId);
	const inputRef = useRef<TextInput>(null);
	const { styles } = useMobileStyles(createTitleStyles);

	if (noteId !== lastNoteId) {
		setLastNoteId(noteId);
		setTitle(initialTitle);
	}

	useEffect(() => {
		setTitle(initialTitle);
	}, [initialTitle]);

	const commitTitle = useCallback(() => {
		const trimmed = title.trim();
		if (trimmed && trimmed !== initialTitle.trim()) {
			onSubmitTitle(trimmed);
		}
	}, [title, initialTitle, onSubmitTitle]);

	return (
		<View style={styles.container} testID="editor-title-field-container">
			<TextInput
				ref={inputRef}
				autoFocus={autoFocus}
				placeholder="Titel"
				placeholderTextColor={styles.placeholder.color}
				returnKeyType="next"
				selectTextOnFocus={autoFocus}
				style={styles.input}
				testID="editor-title-input"
				value={title}
				onBlur={commitTitle}
				onChangeText={setTitle}
				onSubmitEditing={commitTitle}
			/>
		</View>
	);
}

function createTitleStyles(colors: MobileColors, metrics: MobileMetrics) {
	return {
		styles: StyleSheet.create({
			container: {
				paddingHorizontal: metrics.space.md,
				paddingTop: metrics.space.sm,
				paddingBottom: metrics.space.xs,
				borderBottomWidth: StyleSheet.hairlineWidth,
				borderBottomColor: colors.border,
				backgroundColor: colors.editor,
			},
			input: {
				fontSize: metrics.type.title ?? 18,
				fontWeight: "600",
				color: colors.text,
				paddingVertical: metrics.space.xs,
				paddingHorizontal: 0,
			},
			placeholder: {
				color: colors.textMuted,
			},
		}),
	};
}
