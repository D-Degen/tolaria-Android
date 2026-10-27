import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearDiagnosticLogs,
	copyDiagnosticsToClipboard,
	generateDiagnosticReport,
	getDiagnosticLogs,
	logDiagnostic,
} from "./mobileDiagnostics";

vi.mock("../workspace/mobileClipboard", () => ({
	writeMobileClipboardText: vi.fn().mockResolvedValue(undefined),
}));

describe("mobileDiagnostics", () => {
	beforeEach(() => {
		clearDiagnosticLogs();
	});

	it("records and retrieves diagnostic logs correctly", () => {
		logDiagnostic("info", "test", "Test info message");
		logDiagnostic("warn", "sync", "Warning: sync slow");
		logDiagnostic(
			"error",
			"vault",
			"Error loading vault",
			new Error("disk full"),
		);

		const logs = getDiagnosticLogs();
		expect(logs.length).toBe(3);
		expect(logs[0].level).toBe("info");
		expect(logs[0].category).toBe("test");
		expect(logs[0].message).toBe("Test info message");

		expect(logs[2].level).toBe("error");
		expect(logs[2].category).toBe("vault");
		expect(logs[2].message).toBe("Error loading vault");
		expect(logs[2].details).toContain("Error: disk full");
	});

	it("sanitizes sensitive tokens in messages and details", () => {
		logDiagnostic(
			"info",
			"auth",
			"Connected with token ghp_abcdef1234567890abcdef1234567890",
		);
		logDiagnostic(
			"error",
			"auth",
			"Auth failure",
			new Error("Authorization: Bearer secret-token-value-here-123456"),
		);

		const logs = getDiagnosticLogs();
		expect(logs[0].message).not.toContain("ghp_abcdef1234567890");
		expect(logs[0].message).toContain("ghp_***");

		expect(logs[1].details).not.toContain("secret-token-value");
		expect(logs[1].details).toContain("Bearer ***");
	});

	it("generates a formatted markdown diagnostic report", async () => {
		logDiagnostic("info", "boot", "Application started");
		const report = await generateDiagnosticReport();

		expect(report).toContain("# Tolaria Mobile - Diagnose- & Fehlerbericht");
		expect(report).toContain("App Version: 0.2.2 (Build 4)");
		expect(report).toContain("Application started");
	});

	it("copies diagnostic report to clipboard", async () => {
		const result = await copyDiagnosticsToClipboard();
		expect(result.success).toBe(true);
		expect(result.message).toContain(
			"erfolgreich in die Zwischenablage kopiert",
		);
	});
});
