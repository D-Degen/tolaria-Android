import {
	CalendarBlank,
	CheckSquare,
	MagnifyingGlass,
	Square,
} from "phosphor-react-native";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { desktopPanelParity } from "../../ui/desktopParity";
import { MobileIconButton } from "../../ui/MobileIconButton";
import {
	MobilePanel,
	MobileToolbar,
	MobileToolbarSpacer,
	MobileToolbarTitle,
} from "../../ui/MobilePanel";
import { openAndroidDateTimeFlow } from "../../ui/nativeDatePicker";
import { useMobileColors } from "../../ui/theme/useMobileTheme";
import {
	buildMobileTaskEntries,
	formatDue,
	groupMobileTaskEntries,
	type MobileTaskEntry,
	mobileIsoDate,
	mobileShiftIsoDate,
	mobileTaskDueEdit,
	mobileTaskListLabels,
	mobileTaskOpenCount,
	mobileTaskToggleEdit,
	normalizeDue,
} from "../../workspace/mobileTasks";
import type { MobileWorkspaceEdit } from "../../workspace/mobileWorkspaceEditing.types";
import type { MobileNote } from "../../workspace/mobileWorkspaceModel";
import { Text } from "../ui/text";

type MobileTaskListPanelProps = {
	compact?: boolean;
	fullWidth?: boolean;
	leading?: ReactNode;
	notes: MobileNote[];
	onApplyEdit: (edit: MobileWorkspaceEdit) => void;
	onOpenSearch?: () => void;
	onSelectNote: (noteId: string) => void;
	taskCommitDelayMs?: number;
	/** Injectable for tests; defaults to the device date. */
	today?: string;
};

export function MobileTaskListPanel(props: MobileTaskListPanelProps) {
	const colors = useMobileColors();
	const { bottom } = useSafeAreaInsets();
	const [showDone, setShowDone] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const today = props.today ?? mobileIsoDate(new Date());
	const entries = useMemo(
		() => buildMobileTaskEntries(props.notes),
		[props.notes],
	);
	const sections = useMemo(
		() =>
			groupMobileTaskEntries(entries, today).filter(
				(section) => showDone || section.bucket !== "done",
			),
		[entries, showDone, today],
	);
	const doneCount = entries.length - mobileTaskOpenCount(entries);
	const noteById = useMemo(
		() => new Map(props.notes.map((note) => [note.id, note])),
		[props.notes],
	);

	return (
		<MobilePanel
			style={[
				styles.panel,
				props.compact ? styles.panelCompact : null,
				props.fullWidth ? styles.panelFullWidth : null,
				{ paddingBottom: bottom },
			]}
			testID="task-list-panel"
		>
			<MobileToolbar testID="task-list-toolbar">
				{props.leading}
				<MobileToolbarTitle
					testID="task-list-toolbar-title"
					title={mobileTaskListLabels.title}
				/>
				<MobileToolbarSpacer />
				{props.onOpenSearch ? (
					<MobileIconButton
						accessibilityLabel="Suchen"
						testID="task-list-search-action"
						onPress={props.onOpenSearch}
					>
						<MagnifyingGlass color={colors.textMuted} size={18} />
					</MobileIconButton>
				) : null}
			</MobileToolbar>
			<ScrollView
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
				testID="task-list-scroll"
			>
				{sections.length === 0 ? (
					<Text
						style={[styles.empty, { color: colors.textMuted }]}
						testID="task-list-empty"
					>
						{mobileTaskListLabels.empty}
					</Text>
				) : null}
				{sections.map((section) => (
					<View key={section.bucket} testID={`task-section-${section.bucket}`}>
						<Text
							style={[
								styles.sectionTitle,
								{
									color:
										section.bucket === "overdue"
											? colors.danger
											: colors.textMuted,
								},
							]}
						>
							{`${mobileTaskListLabels.sections[section.bucket]} · ${section.entries.length}`}
						</Text>
						{section.entries.map((entry) => (
							<TaskRow
								commitDelayMs={props.taskCommitDelayMs}
								editing={editingId === entry.id}
								entry={entry}
								key={entry.id}
								note={noteById.get(entry.noteId)}
								today={today}
								onApplyEdit={props.onApplyEdit}
								onCloseEditor={() => setEditingId(null)}
								onOpenNote={() => props.onSelectNote(entry.noteId)}
								onToggleEditor={() =>
									setEditingId((current) =>
										current === entry.id ? null : entry.id,
									)
								}
							/>
						))}
					</View>
				))}
				{doneCount > 0 ? (
					<Pressable
						accessibilityRole="button"
						style={styles.doneToggle}
						testID="task-list-toggle-done"
						onPress={() => setShowDone((value) => !value)}
					>
						<Text style={[styles.doneToggleText, { color: colors.primary }]}>
							{`${showDone ? mobileTaskListLabels.doneShown : mobileTaskListLabels.doneHidden} (${doneCount})`}
						</Text>
					</Pressable>
				) : null}
			</ScrollView>
		</MobilePanel>
	);
}

type TaskRowProps = {
	commitDelayMs?: number;
	editing: boolean;
	entry: MobileTaskEntry;
	note: MobileNote | undefined;
	today: string;
	onApplyEdit: (edit: MobileWorkspaceEdit) => void;
	onCloseEditor: () => void;
	onOpenNote: () => void;
	onToggleEditor: () => void;
};

function TaskRow({
	commitDelayMs = 650,
	editing,
	entry,
	note,
	today,
	onApplyEdit,
	onCloseEditor,
	onOpenNote,
	onToggleEditor,
}: TaskRowProps) {
	const colors = useMobileColors();
	const reducedMotion = useReducedMotion();
	const [isPendingDone, setIsPendingDone] = useState(false);
	const isPendingDoneRef = useRef(false);

	const isDone = entry.done || isPendingDone;
	const Box = isDone ? CheckSquare : Square;
	const overdue = !isDone && entry.due !== null && entry.due < today;

	const checkScale = useSharedValue(1);
	const rowOpacity = useSharedValue(1);

	const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimers = useCallback(() => {
		if (holdTimerRef.current) {
			clearTimeout(holdTimerRef.current);
			holdTimerRef.current = null;
		}
		if (fadeTimerRef.current) {
			clearTimeout(fadeTimerRef.current);
			fadeTimerRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => {
			if (isPendingDoneRef.current) {
				onApplyEdit(mobileTaskToggleEdit(entry));
			}
			clearTimers();
		};
	}, [entry, onApplyEdit, clearTimers]);

	const animatedCheckStyle = useAnimatedStyle(() => ({
		transform: [{ scale: checkScale.value }],
	}));

	const animatedRowStyle = useAnimatedStyle(() => ({
		opacity: rowOpacity.value,
	}));

	const handleToggle = useCallback(() => {
		if (entry.done) {
			onApplyEdit(mobileTaskToggleEdit(entry));
			return;
		}

		if (isPendingDone) {
			clearTimers();
			isPendingDoneRef.current = false;
			setIsPendingDone(false);
			rowOpacity.set(1);
			checkScale.set(1);
			return;
		}

		if (commitDelayMs <= 0) {
			onApplyEdit(mobileTaskToggleEdit(entry));
			return;
		}

		isPendingDoneRef.current = true;
		setIsPendingDone(true);

		if (!reducedMotion) {
			checkScale.set(0.5);
			checkScale.set(withSpring(1, { damping: 14, mass: 0.8, stiffness: 220 }));
		}

		const fadeDuration = reducedMotion ? 0 : 350;
		holdTimerRef.current = setTimeout(() => {
			if (!reducedMotion) {
				rowOpacity.set(withTiming(0, { duration: fadeDuration }));
			}
			fadeTimerRef.current = setTimeout(() => {
				isPendingDoneRef.current = false;
				setIsPendingDone(false);
				rowOpacity.set(1);
				checkScale.set(1);
				onApplyEdit(mobileTaskToggleEdit(entry));
			}, fadeDuration);
		}, commitDelayMs);
	}, [
		entry,
		isPendingDone,
		commitDelayMs,
		onApplyEdit,
		clearTimers,
		checkScale,
		rowOpacity,
		reducedMotion,
	]);

	return (
		<Animated.View
			style={[
				styles.row,
				{ borderBottomColor: colors.border },
				animatedRowStyle,
			]}
			testID={`task-row-${entry.id}`}
		>
			<View style={styles.rowMain}>
				<Pressable
					accessibilityLabel={isDone ? "Als offen markieren" : "Abhaken"}
					accessibilityRole="checkbox"
					accessibilityState={{ checked: isDone }}
					hitSlop={8}
					testID={`task-toggle-${entry.id}`}
					onPress={handleToggle}
				>
					<Animated.View style={animatedCheckStyle}>
						<Box
							color={isDone ? colors.primary : colors.textMuted}
							size={24}
							weight={isDone ? "fill" : "regular"}
						/>
					</Animated.View>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					style={styles.rowText}
					testID={`task-open-${entry.id}`}
					onPress={onOpenNote}
				>
					<Text
						numberOfLines={2}
						style={[
							styles.rowTitle,
							{ color: isDone ? colors.textMuted : colors.text },
							isDone ? styles.rowTitleDone : null,
						]}
					>
						{entry.title}
					</Text>
					{entry.kind === "checkbox" ? (
						<Text
							numberOfLines={1}
							style={[styles.rowSubtitle, { color: colors.textMuted }]}
						>
							{`↳ ${entry.subtitle}`}
						</Text>
					) : null}
				</Pressable>
				<Pressable
					accessibilityLabel={mobileTaskListLabels.openDueEditor}
					accessibilityRole="button"
					hitSlop={6}
					style={[
						styles.dueChip,
						{ backgroundColor: overdue ? colors.danger : colors.primarySoft },
					]}
					testID={`task-due-${entry.id}`}
					onPress={onToggleEditor}
				>
					<CalendarBlank
						color={overdue ? colors.textInverse : colors.primary}
						size={14}
					/>
					<Text
						style={[
							styles.dueText,
							{ color: overdue ? colors.textInverse : colors.primary },
						]}
					>
						{entry.due
							? `${formatDue(entry.due, today)}${entry.time ? ` ⏰ ${entry.time}` : ""}${entry.inheritedDue ? ` (${mobileTaskListLabels.inheritedDue})` : ""}`
							: "—"}
					</Text>
				</Pressable>
			</View>
			{editing ? (
				<DueEditor
					current={entry.inheritedDue ? null : entry.due}
					currentTime={entry.time ?? null}
					today={today}
					onPick={(due, time) => {
						const edit = mobileTaskDueEdit(entry, note, due, time);
						if (!edit) return false;
						onApplyEdit(edit);
						onCloseEditor();
						return true;
					}}
				/>
			) : null}
		</Animated.View>
	);
}

function DueEditor({
	current,
	currentTime,
	today,
	onPick,
}: {
	current: string | null;
	currentTime?: string | null;
	today: string;
	onPick: (due: string | null, time?: string | null) => boolean;
}) {
	const colors = useMobileColors();
	const [text, setText] = useState(current ?? "");
	const [invalid, setInvalid] = useState(false);
	const quick: Array<{ id: string; label: string; due: string | null }> = [
		{ due: today, id: "today", label: mobileTaskListLabels.today },
		{
			due: mobileShiftIsoDate(today, 1),
			id: "tomorrow",
			label: mobileTaskListLabels.tomorrow,
		},
		{
			due: mobileShiftIsoDate(today, 7),
			id: "week",
			label: mobileTaskListLabels.nextWeek,
		},
		{ due: null, id: "clear", label: mobileTaskListLabels.clearDue },
	];
	const submitText = () => {
		const normalized = normalizeDue(text);
		if (!normalized) return setInvalid(true);
		setInvalid(!onPick(normalized));
	};

	const handleOpenNativePicker = () => {
		void openAndroidDateTimeFlow({
			initialDate: current ? new Date(current) : new Date(),
			initialTime: currentTime ?? undefined,
			onSelect: (due, time) => {
				onPick(due, time);
			},
		});
	};

	return (
		<View style={styles.editor} testID="task-due-editor">
			<View style={styles.editorChips}>
				<Pressable
					accessibilityRole="button"
					style={[
						styles.quickChip,
						{
							backgroundColor: colors.primarySoft,
							borderColor: colors.primary,
						},
					]}
					testID="task-due-quick-calendar"
					onPress={handleOpenNativePicker}
				>
					<Text style={[styles.quickChipText, { color: colors.primary }]}>
						📅 Kalender
					</Text>
				</Pressable>
				{quick.map((option) => (
					<Pressable
						accessibilityRole="button"
						key={option.id}
						style={[styles.quickChip, { borderColor: colors.border }]}
						testID={`task-due-quick-${option.id}`}
						onPress={() => onPick(option.due)}
					>
						<Text style={[styles.quickChipText, { color: colors.text }]}>
							{option.label}
						</Text>
					</Pressable>
				))}
			</View>
			<TextInput
				accessibilityLabel="Datum (JJJJ-MM-TT oder TT.MM.JJJJ)"
				autoCapitalize="none"
				keyboardType="numbers-and-punctuation"
				maxLength={10}
				placeholder="JJJJ-MM-TT oder TT.MM.JJJJ"
				placeholderTextColor={colors.textMuted}
				style={[
					styles.dateInput,
					{
						borderColor: invalid ? colors.danger : colors.border,
						color: colors.text,
					},
				]}
				testID="task-due-input"
				value={text}
				onChangeText={(value) => {
					setText(value);
					setInvalid(false);
				}}
				onSubmitEditing={submitText}
				returnKeyType="done"
			/>
			{invalid ? (
				<Text style={[styles.invalid, { color: colors.danger }]}>
					{mobileTaskListLabels.invalidDate}
				</Text>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	content: { paddingBottom: 96 },
	doneToggle: { alignItems: "center", padding: 16 },
	doneToggleText: { fontSize: 14, fontWeight: "600" },
	dateInput: {
		borderRadius: 8,
		borderWidth: 1,
		fontSize: 15,
		marginTop: 8,
		paddingHorizontal: 10,
		paddingVertical: 8,
	},
	dueChip: {
		alignItems: "center",
		borderRadius: 12,
		flexDirection: "row",
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	dueText: { fontSize: 12, fontWeight: "600" },
	editor: { paddingBottom: 12, paddingLeft: 36 },
	editorChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	empty: { fontSize: 14, lineHeight: 20, padding: 24, textAlign: "center" },
	invalid: { fontSize: 12, marginTop: 4 },
	panel: {
		alignSelf: "stretch",
		borderRightWidth: StyleSheet.hairlineWidth,
		height: "100%",
		width: desktopPanelParity.noteListWidth,
	},
	panelCompact: { width: 336 },
	panelFullWidth: { width: "100%" },
	quickChip: {
		borderRadius: 14,
		borderWidth: 1,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	quickChipText: { fontSize: 13 },
	row: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	rowMain: { alignItems: "center", flexDirection: "row", gap: 12 },
	rowSubtitle: { fontSize: 12, marginTop: 2 },
	rowText: { flex: 1 },
	rowTitle: { fontSize: 15, fontWeight: "500" },
	rowTitleDone: { textDecorationLine: "line-through" },
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		letterSpacing: 0.4,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 6,
		textTransform: "uppercase",
	},
});
