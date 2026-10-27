export type DiagnosticLogLevel = "info" | "warn" | "error";

export type DiagnosticEntry = {
	timestamp: string;
	level: DiagnosticLogLevel;
	category: string;
	message: string;
	details?: string;
};

const MAX_LOG_ENTRIES = 300;
const logBuffer: DiagnosticEntry[] = [];

function getPlatformInfo() {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const rn = require("react-native");
		if (rn?.Platform) {
			return { os: rn.Platform.OS, version: String(rn.Platform.Version) };
		}
	} catch {
		// Ignore in tests
	}
	return {
		os: typeof process !== "undefined" ? process.platform : "unknown",
		version: "unknown",
	};
}

export function logDiagnostic(
	level: DiagnosticLogLevel,
	category: string,
	message: string,
	error?: unknown,
) {
	const timestamp = new Date().toISOString();
	let details: string | undefined;

	if (error !== undefined) {
		if (error instanceof Error) {
			details = `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
		} else if (typeof error === "object" && error !== null) {
			try {
				details = JSON.stringify(error);
			} catch {
				details = String(error);
			}
		} else {
			details = String(error);
		}
		details = sanitizeSensitiveData(details);
	}

	const sanitizedMessage = sanitizeSensitiveData(message);

	logBuffer.push({
		category,
		details,
		level,
		message: sanitizedMessage,
		timestamp,
	});

	if (logBuffer.length > MAX_LOG_ENTRIES) {
		logBuffer.shift();
	}

	if (typeof __DEV__ !== "undefined" && __DEV__) {
		const consoleMethod =
			level === "error"
				? console.error
				: level === "warn"
					? console.warn
					: console.log;
		consoleMethod(`[Tolaria:${category}] ${sanitizedMessage}`, details ?? "");
	}
}

export function getDiagnosticLogs(): ReadonlyArray<DiagnosticEntry> {
	return [...logBuffer];
}

export function clearDiagnosticLogs() {
	logBuffer.length = 0;
}

function sanitizeSensitiveData(text: string): string {
	return text
		.replace(/ghp_[A-Za-z0-9_]{20,}/g, "ghp_***")
		.replace(/github_pat_[A-Za-z0-9_]{20,}/g, "github_pat_***")
		.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer ***")
		.replace(/("accessToken"\s*:\s*")[^"]+(")/gi, "$1***$2")
		.replace(/("token"\s*:\s*")[^"]+(")/gi, "$1***$2");
}

export async function generateDiagnosticReport(): Promise<string> {
	const now = new Date().toISOString();
	const platform = getPlatformInfo();
	const reportLines: string[] = [
		"# Tolaria Mobile - Diagnose- & Fehlerbericht",
		`Erstellt am: ${now}`,
		`App Version: 0.2.2 (Build 4)`,
		`Plattform: ${platform.os} (Version: ${platform.version})`,
		"",
		"## 1. Dateisystem- & Speicherstatus",
	];

	try {
		const { Paths, Directory, File } = await import("expo-file-system");
		reportLines.push(`Dokumentenverzeichnis: ${Paths.document?.uri ?? "N/A"}`);

		const docDir = new Directory(Paths.document);
		if (docDir.exists) {
			const items = docDir
				.list()
				.map((item) => `${item.name}${item instanceof Directory ? "/" : ""}`);
			reportLines.push(`Inhalt Dokumente: ${items.join(", ") || "(leer)"}`);

			const gitVaultsDir = new Directory(Paths.document, "Git Vaults");
			if (gitVaultsDir.exists) {
				const gitVaults = gitVaultsDir.list().map((item) => item.name);
				reportLines.push(
					`Git Vaults (${gitVaults.length}): ${gitVaults.join(", ") || "(keine)"}`,
				);
			} else {
				reportLines.push("Git Vaults: (Verzeichnis existiert nicht)");
			}

			const localVaultsDir = new Directory(Paths.document, "Local Vaults");
			if (localVaultsDir.exists) {
				const localVaults = localVaultsDir.list().map((item) => item.name);
				reportLines.push(
					`Local Vaults (${localVaults.length}): ${localVaults.join(", ") || "(keine)"}`,
				);
			} else {
				reportLines.push("Local Vaults: (Verzeichnis existiert nicht)");
			}

			const configFile = new File(
				Paths.document,
				".tolaria-mobile-config",
				"git-vaults.json",
			);
			if (configFile.exists) {
				const rawCatalog = await configFile.text();
				reportLines.push(
					`Katalog-Konfiguration (.tolaria-mobile-config/git-vaults.json):`,
				);
				reportLines.push("```json");
				reportLines.push(sanitizeSensitiveData(rawCatalog));
				reportLines.push("```");
			} else {
				reportLines.push("Katalog-Konfiguration: Datei nicht gefunden");
			}
		} else {
			reportLines.push(
				"Dokumentenverzeichnis existiert nicht auf dem Dateisystem.",
			);
		}
	} catch (err) {
		reportLines.push(
			`Fehler bei Ermittlung des Dateisystemstatus: ${String(err)}`,
		);
	}

	reportLines.push("");
	reportLines.push(
		`## 2. Ereignis- & Fehlerprotokoll (${logBuffer.length} Einträge)`,
	);

	if (logBuffer.length === 0) {
		reportLines.push("*(Keine Protokolleinträge vorhanden)*");
	} else {
		for (const entry of logBuffer) {
			const levelBadge = entry.level.toUpperCase().padEnd(5);
			reportLines.push(
				`- \`[${entry.timestamp}] [${levelBadge}] [${entry.category}]\` ${entry.message}`,
			);
			if (entry.details) {
				reportLines.push("  ```");
				reportLines.push(`  ${entry.details.split("\n").join("\n  ")}`);
				reportLines.push("  ```");
			}
		}
	}

	reportLines.push("");
	reportLines.push("---");
	reportLines.push("*Ende des Berichts*");

	return reportLines.join("\n");
}

export async function copyDiagnosticsToClipboard(): Promise<{
	success: boolean;
	message: string;
}> {
	try {
		const report = await generateDiagnosticReport();
		const { writeMobileClipboardText } = await import(
			"../workspace/mobileClipboard"
		);
		await writeMobileClipboardText(report);
		logDiagnostic(
			"info",
			"diagnostics",
			"Diagnostic report copied to clipboard successfully",
		);
		return {
			message: "Diagnosebericht erfolgreich in die Zwischenablage kopiert.",
			success: true,
		};
	} catch (error) {
		logDiagnostic(
			"error",
			"diagnostics",
			"Failed to copy diagnostic report to clipboard",
			error,
		);
		return {
			message: `Kopieren fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
			success: false,
		};
	}
}
