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

	it("reports true for support when Platform.OS is android", async () => {
		Platform.OS = "android";
		expect(isAndroidPickerSupported()).toBe(true);
	});
});
