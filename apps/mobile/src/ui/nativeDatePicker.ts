import { Platform } from "react-native";

export function isAndroidPickerSupported(): boolean {
	return Platform.OS === "android";
}

export async function openAndroidDatePicker(options: {
	initialDate?: Date;
	onCancel?: () => void;
	onSelect: (isoDate: string) => void;
}): Promise<boolean> {
	void options;
	return false;
}

export async function openAndroidTimePicker(options: {
	initialTime?: string;
	onCancel?: () => void;
	onSelect: (time: string) => void;
}): Promise<boolean> {
	void options;
	return false;
}

export async function openAndroidDateTimeFlow(options: {
	initialDate?: Date;
	initialTime?: string;
	onCancel?: () => void;
	onSelect: (isoDate: string, time: string | null) => void;
}): Promise<boolean> {
	void options;
	return false;
}
