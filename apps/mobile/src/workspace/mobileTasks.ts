import type { MobileWorkspaceEdit } from "./mobileWorkspaceEditing.types";
import type {
	MobileNote,
	MobileNoteChecklistItem,
	MobilePropertyValue,
} from "./mobileWorkspaceModel";

/**
 * Task model for the "Aufgaben" overview (hybrid):
 * - every note whose type is `Task` is a main task (due date + status on note level)
 * - every markdown checkbox (`- [ ]`) of ANY note is an item of its own, regardless of the note type
 *
 * Checkbox due dates use the Obsidian-Tasks convention `📅 YYYY-MM-DD` inside the checkbox line.
 */

export type MobileTaskBucket =
	| "overdue"
	| "today"
	| "upcoming"
	| "noDate"
	| "done";

export type MobileTaskEntry =
	| {
			kind: "note";
			id: string;
			noteId: string;
			title: string;
			done: boolean;
			due: string | null;
			time?: string | null;
			inheritedDue: false;
			subtitle: string;
	  }
	| {
			kind: "checkbox";
			id: string;
			noteId: string;
			line: number;
			title: string;
			done: boolean;
			due: string | null;
			time?: string | null;
			inheritedDue: boolean;
			subtitle: string;
			parentIsTask: boolean;
	  };

export type MobileTaskSection = {
	bucket: MobileTaskBucket;
	entries: MobileTaskEntry[];
};

export const mobileTaskBucketOrder: MobileTaskBucket[] = [
	"overdue",
	"today",
	"upcoming",
	"noDate",
	"done",
];

const CHECKBOX_PATTERN = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\]\s+)(.*)$/u;
const DUE_MARKER_PATTERN =
	/\s*(?:📅|🗓️|\[due::?|\(due::?|@due\(|\bdue:)\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})(?:\s*(?:⏰|\bum\s*|\bat\s*)?\s*([01]?\d|2[0-3]):([0-5]\d))?\)?\]?/u;
const DUE_PROPERTY_KEYS = [
	"due",
	"due_date",
	"duedate",
	"due date",
	"deadline",
];
const DONE_STATUSES = new Set([
	"done",
	"completed",
	"complete",
	"closed",
	"finished",
	"erledigt",
	"cancelled",
	"canceled",
]);
const MAX_ITEMS_PER_NOTE = 200;

export const mobileTaskDoneStatus = "Done";
export const mobileTaskOpenStatus = "Open";

export const mobileTaskListLabels = {
	clearDue: "Kein Datum",
	doneHidden: "Erledigte anzeigen",
	doneShown: "Erledigte ausblenden",
	empty:
		"Keine Aufgaben. Notizen vom Typ „Task“ und alle Checkboxen (- [ ]) erscheinen hier.",
	invalidDate: "Bitte Datum als JJJJ-MM-TT oder TT.MM.JJJJ eingeben",
	inheritedDue: "von Notiz",
	nextWeek: "In 1 Woche",
	openDueEditor: "Fälligkeitsdatum ändern",
	sections: {
		done: "Erledigt",
		noDate: "Ohne Datum",
		overdue: "Überfällig",
		today: "Heute",
		upcoming: "Demnächst",
	} satisfies Record<MobileTaskBucket, string>,
	title: "Aufgaben",
	today: "Heute",
	tomorrow: "Morgen",
};

export function formatDue(due: string, today: string): string {
	if (due === today) return mobileTaskListLabels.today;
	if (due === mobileShiftIsoDate(today, 1))
		return mobileTaskListLabels.tomorrow;
	const [year, month, day] = due.split("-");
	return year === today.slice(0, 4)
		? `${day}.${month}.`
		: `${day}.${month}.${year}`;
}

export function isMobileTaskNote(note: Pick<MobileNote, "type">): boolean {
	return note.type.trim().toLowerCase() === "task";
}

export function extractChecklistItems(
	rawContent: string,
): MobileNoteChecklistItem[] {
	const lines = rawContent.split(/\r?\n/u);
	const items: MobileNoteChecklistItem[] = [];
	let index = frontmatterEnd(lines);
	let fence: string | null = null;

	for (
		;
		index < lines.length && items.length < MAX_ITEMS_PER_NOTE;
		index += 1
	) {
		const line = lines[index];
		const fenceMatch = /^\s*(```+|~~~+)/u.exec(line);
		if (fenceMatch) {
			const marker = fenceMatch[1][0];
			if (fence === null) fence = marker;
			else if (fence === marker) fence = null;
			continue;
		}
		if (fence !== null) continue;
		const item = parseChecklistLine(line, index);
		if (item) items.push(item);
	}
	return items;
}

export function parseChecklistLine(
	line: string,
	lineIndex: number,
): MobileNoteChecklistItem | null {
	const match = CHECKBOX_PATTERN.exec(line);
	if (!match) return null;
	const rawText = match[4];
	const dueMatch = DUE_MARKER_PATTERN.exec(rawText);
	const rawDue = dueMatch?.[1] ?? null;
	const due = rawDue ? normalizeDue(rawDue) : null;
	const time =
		dueMatch?.[2] && dueMatch[3]
			? `${dueMatch[2].padStart(2, "0")}:${dueMatch[3]}`
			: null;
	const text = rawText.replace(DUE_MARKER_PATTERN, "").trim();
	if (!text) return null;
	return { checked: match[2] !== " ", due, line: lineIndex, text, time };
}

export type ChecklistItemChange = {
	checked?: boolean;
	due?: string | null;
	time?: string | null;
};

/**
 * Applies a change to a single checkbox line.
 * If the line index has drifted (e.g. from frontmatter or previous edits),
 * searches the file for the matching checkbox line so edits are never silently lost.
 */
export function applyChecklistItemChange(
	rawContent: string,
	line: number,
	expectedText: string,
	change: ChecklistItemChange,
): string {
	const newline = rawContent.includes("\r\n") ? "\r\n" : "\n";
	const lines = rawContent.split(/\r?\n/u);
	let targetLine = line;
	let current = lines[targetLine];
	let match = current !== undefined ? CHECKBOX_PATTERN.exec(current) : null;
	let parsed =
		match && current !== undefined
			? parseChecklistLine(current, targetLine)
			: null;

	const trimmedExpected = expectedText.trim();
	if (!match || !parsed || parsed.text !== trimmedExpected) {
		let found = -1;
		for (let i = 0; i < lines.length; i += 1) {
			const candidate = parseChecklistLine(lines[i], i);
			if (candidate && candidate.text === trimmedExpected) {
				found = i;
				break;
			}
		}
		if (found === -1) {
			for (let i = 0; i < lines.length; i += 1) {
				const candidate = parseChecklistLine(lines[i], i);
				if (
					candidate &&
					(candidate.text.startsWith(trimmedExpected) ||
						trimmedExpected.startsWith(candidate.text))
				) {
					found = i;
					break;
				}
			}
		}
		if (found === -1) return rawContent;
		targetLine = found;
		current = lines[targetLine];
		const fallbackMatch = CHECKBOX_PATTERN.exec(current);
		const fallbackParsed = parseChecklistLine(current, targetLine);
		if (!fallbackMatch || !fallbackParsed) return rawContent;
		match = fallbackMatch;
		parsed = fallbackParsed;
	}

	const checked = change.checked ?? parsed.checked;
	const due = change.due === undefined ? parsed.due : normalizeDue(change.due);
	const time = change.time === undefined ? parsed.time : change.time;
	let suffix = "";
	if (due) {
		suffix = time ? ` 📅 ${due} ⏰ ${time}` : ` 📅 ${due}`;
	}
	lines[targetLine] =
		`${match[1]}${checked ? "x" : " "}${match[3]}${parsed.text}${suffix}`;
	return lines.join(newline);
}

export function mobileTaskNoteTime(
	note: Pick<MobileNote, "properties">,
): string | null {
	for (const property of note.properties ?? []) {
		const key = property.key.trim().toLowerCase();
		if (
			["time", "due_time", "duetime", "uhrzeit"].includes(key) &&
			typeof property.value === "string"
		) {
			const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(property.value.trim());
			if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
		}
		if (DUE_PROPERTY_KEYS.includes(key) && typeof property.value === "string") {
			const match = /(?:⏰|\bum\s*|\bat\s*)?\s*([01]?\d|2[0-3]):([0-5]\d)/.exec(
				property.value,
			);
			if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
		}
	}
	return null;
}

export function mobileTaskNoteDue(
	note: Pick<MobileNote, "properties">,
): string | null {
	for (const property of note.properties ?? []) {
		if (!DUE_PROPERTY_KEYS.includes(property.key.trim().toLowerCase()))
			continue;
		const due = isoDateFromValue(property.value);
		if (due) return due;
	}
	return null;
}

export function mobileTaskNoteDueKey(
	note: Pick<MobileNote, "properties">,
): string {
	const existing = (note.properties ?? []).find((property) =>
		DUE_PROPERTY_KEYS.includes(property.key.trim().toLowerCase()),
	);
	return existing?.key ?? "due";
}

export function isMobileTaskNoteDone(
	note: Pick<MobileNote, "properties" | "status">,
): boolean {
	if (DONE_STATUSES.has(note.status.trim().toLowerCase())) return true;
	const doneProperty = (note.properties ?? []).find(
		(property) => property.key.trim().toLowerCase() === "done",
	);
	return doneProperty?.value === true;
}

export function buildMobileTaskEntries(notes: MobileNote[]): MobileTaskEntry[] {
	return notes.filter((note) => !note.archived).flatMap(taskEntriesForNote);
}

function taskEntriesForNote(note: MobileNote): MobileTaskEntry[] {
	const isTask = isMobileTaskNote(note);
	const noteDue = isTask ? mobileTaskNoteDue(note) : null;
	const noteTime = isTask ? mobileTaskNoteTime(note) : null;
	const entries: MobileTaskEntry[] = [];
	if (isTask) {
		entries.push({
			done: isMobileTaskNoteDone(note),
			due: noteDue,
			id: `note:${note.id}`,
			inheritedDue: false,
			kind: "note",
			noteId: note.id,
			subtitle: note.snippet,
			time: noteTime,
			title: note.title,
		});
	}
	const items =
		note.taskItems ??
		(note.rawContent ? extractChecklistItems(note.rawContent) : []);
	for (const item of items) {
		entries.push({
			done: item.checked,
			due: item.due ?? noteDue,
			id: `checkbox:${note.id}:${item.line}`,
			inheritedDue: item.due === null && noteDue !== null,
			kind: "checkbox",
			line: item.line,
			noteId: note.id,
			parentIsTask: isTask,
			subtitle: note.title,
			time: item.time ?? (item.due === null ? noteTime : null),
			title: item.text,
		});
	}
	return entries;
}

export function mobileTaskBucketFor(
	entry: Pick<MobileTaskEntry, "done" | "due">,
	today: string,
): MobileTaskBucket {
	if (entry.done) return "done";
	if (!entry.due) return "noDate";
	if (entry.due < today) return "overdue";
	return entry.due === today ? "today" : "upcoming";
}

export function groupMobileTaskEntries(
	entries: MobileTaskEntry[],
	today: string,
): MobileTaskSection[] {
	const buckets = new Map<MobileTaskBucket, MobileTaskEntry[]>(
		mobileTaskBucketOrder.map((bucket) => [bucket, []]),
	);
	for (const entry of entries)
		buckets.get(mobileTaskBucketFor(entry, today))?.push(entry);
	return mobileTaskBucketOrder
		.map((bucket) => ({
			bucket,
			entries: [...(buckets.get(bucket) ?? [])].sort(compareTaskEntries),
		}))
		.filter((section) => section.entries.length > 0);
}

function compareTaskEntries(
	left: MobileTaskEntry,
	right: MobileTaskEntry,
): number {
	if (left.due !== right.due) {
		if (!left.due) return 1;
		if (!right.due) return -1;
		return left.due < right.due ? -1 : 1;
	}
	if (left.kind !== right.kind) return left.kind === "note" ? -1 : 1;
	return left.title.localeCompare(right.title);
}

export function mobileTaskOpenCount(entries: MobileTaskEntry[]): number {
	return entries.filter((entry) => !entry.done).length;
}

export function mobileIsoDate(date: Date): string {
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

export function mobileShiftIsoDate(today: string, days: number): string {
	const [year, month, day] = today.split("-").map(Number);
	return mobileIsoDate(new Date(year, month - 1, day + days));
}

export function normalizeDue(value: string | null): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/u.exec(trimmed);
	if (isoMatch) {
		const [, y, m, d] = isoMatch;
		const year = Number(y);
		const month = Number(m);
		const day = Number(d);
		const date = new Date(year, month - 1, day);
		const valid =
			date.getFullYear() === year &&
			date.getMonth() === month - 1 &&
			date.getDate() === day;
		return valid ? `${y}-${m}-${d}` : null;
	}
	const deMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[T\s].*)?$/u.exec(trimmed);
	if (deMatch) {
		const [, d, m, y] = deMatch;
		const year = Number(y);
		const month = Number(m);
		const day = Number(d);
		const date = new Date(year, month - 1, day);
		const valid =
			date.getFullYear() === year &&
			date.getMonth() === month - 1 &&
			date.getDate() === day;
		if (!valid) return null;
		const monthStr = `${month}`.padStart(2, "0");
		const dayStr = `${day}`.padStart(2, "0");
		return `${year}-${monthStr}-${dayStr}`;
	}
	return null;
}

function isoDateFromValue(value: MobilePropertyValue): string | null {
	if (typeof value !== "string") return null;
	return normalizeDue(value.trim().slice(0, 10));
}

function frontmatterEnd(lines: string[]): number {
	if (lines[0]?.trim() !== "---") return 0;
	for (let index = 1; index < lines.length; index += 1) {
		if (lines[index].trim() === "---") return index + 1;
	}
	return 0;
}

export function mobileTaskToggleEdit(
	entry: MobileTaskEntry,
): MobileWorkspaceEdit {
	if (entry.kind === "checkbox") {
		return {
			checked: !entry.done,
			expectedText: entry.title,
			line: entry.line,
			noteId: entry.noteId,
			type: "updateChecklistItem",
		};
	}
	return {
		key: "status",
		noteId: entry.noteId,
		type: "updateProperty",
		value: entry.done ? mobileTaskOpenStatus : mobileTaskDoneStatus,
	};
}

/** `due === null` clears the due date. Returns null when the date is not a valid YYYY-MM-DD value. */
export function mobileTaskDueEdit(
	entry: MobileTaskEntry,
	note: Pick<MobileNote, "properties"> | undefined,
	due: string | null,
	time?: string | null,
): MobileWorkspaceEdit | null {
	const normalized = due === null ? null : normalizeDue(due);
	if (due !== null && normalized === null) return null;
	if (entry.kind === "checkbox") {
		const edit: MobileWorkspaceEdit = {
			due: normalized,
			expectedText: entry.title,
			line: entry.line,
			noteId: entry.noteId,
			type: "updateChecklistItem",
		};
		if (time !== undefined) {
			edit.time = time;
		}
		return edit;
	}
	const key = note ? mobileTaskNoteDueKey(note) : "due";
	if (normalized === null)
		return { key, noteId: entry.noteId, type: "deleteProperty" };
	const val = time ? `${normalized} ${time}` : normalized;
	return { key, noteId: entry.noteId, type: "updateProperty", value: val };
}
