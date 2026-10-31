import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Platform } from "react-native";

export function isAndroidPickerSupported(): boolean {
	return Platform.OS === "android";
}

async function getDateTimePickerAndroid() {
	try {
		const module = await import("@react-native-community/datetimepicker");
		return module.DateTimePickerAndroid;
	} catch {
		return null;
	}
}

export async function openAndroidDatePicker(options: {
	initialDate?: Date;
	onCancel?: () => void;
	onSelect: (isoDate: string) => void;
}): Promise<boolean> {
	if (Platform.OS !== "android") return false;
	try {
		const DateTimePickerAndroid = await getDateTimePickerAndroid();
		if (!DateTimePickerAndroid) return false;

		DateTimePickerAndroid.open({
			is24Hour: true,
			mode: "date",
			value: options.initialDate ?? new Date(),
			onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
				if (event.type === "set" && selectedDate) {
					const year = selectedDate.getFullYear();
					const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
					const day = String(selectedDate.getDate()).padStart(2, "0");
					options.onSelect(`${year}-${month}-${day}`);
				} else if (event.type === "dismissed") {
					options.onCancel?.();
				}
			},
		});
		return true;
	} catch {
		return false;
	}
}

export async function openAndroidTimePicker(options: {
	initialTime?: string;
	onCancel?: () => void;
	onSelect: (time: string) => void;
}): Promise<boolean> {
	if (Platform.OS !== "android") return false;
	try {
		const DateTimePickerAndroid = await getDateTimePickerAndroid();
		if (!DateTimePickerAndroid) return false;

		const value = new Date();
		if (
			options.initialTime &&
			/^([01]\d|2[0-3]):[0-5]\d$/.test(options.initialTime.trim())
		) {
			const [h, m] = options.initialTime.trim().split(":").map(Number);
			value.setHours(h, m, 0, 0);
		}
		DateTimePickerAndroid.open({
			is24Hour: true,
			mode: "time",
			value,
			onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
				if (event.type === "set" && selectedDate) {
					const hours = String(selectedDate.getHours()).padStart(2, "0");
					const minutes = String(selectedDate.getMinutes()).padStart(2, "0");
					options.onSelect(`${hours}:${minutes}`);
				} else if (event.type === "dismissed") {
					options.onCancel?.();
				}
			},
		});
		return true;
	} catch {
		return false;
	}
}

export async function openAndroidDateTimeFlow(options: {
	initialDate?: Date;
	initialTime?: string;
	onCancel?: () => void;
	onSelect: (isoDate: string, time: string | null) => void;
}): Promise<boolean> {
	return openAndroidDatePicker({
		initialDate: options.initialDate,
		onCancel: options.onCancel,
		onSelect: (isoDate) => {
			void openAndroidTimePicker({
				initialTime: options.initialTime,
				onCancel: () => {
					options.onSelect(isoDate, null);
				},
				onSelect: (time) => {
					options.onSelect(isoDate, time);
				},
			});
		},
	});
}
