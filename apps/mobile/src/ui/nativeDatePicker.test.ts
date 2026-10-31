import { Platform } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	isAndroidPickerSupported,
	openAndroidDatePicker,
	openAndroidDateTimeFlow,
	openAndroidTimePicker,
} from "./nativeDatePicker";

describe("nativeDatePicker", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("reports false when Platform.OS is not android", async () => {
		Platform.OS = "web";
		expect(isAndroidPickerSupported()).toBe(false);
		expect(await openAndroidDatePicker({ onSelect: vi.fn() })).toBe(false);
		expect(await openAndroidTimePicker({ onSelect: vi.fn() })).toBe(false);
		expect(await openAndroidDateTimeFlow({ onSelect: vi.fn() })).toBe(false);
	});

	it("attempts to call DateTimePickerAndroid.open when on android", async () => {
		Platform.OS = "android";
		expect(isAndroidPickerSupported()).toBe(true);

		const onSelect = vi.fn();
		const result = await openAndroidDatePicker({ onSelect });
		expect(typeof result).toBe("boolean");
	});
});
