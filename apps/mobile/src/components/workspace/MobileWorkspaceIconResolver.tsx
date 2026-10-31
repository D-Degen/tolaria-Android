import type { Icon } from "phosphor-react-native";
import * as PhosphorIcons from "phosphor-react-native";
import { normalizeIconKey } from "./MobileWorkspaceIconNames";

export function mobilePhosphorIconElement(
	icon: string | null | undefined,
	props: {
		color: string;
		size: number;
		testID?: string;
	},
) {
	const IconComponent = mobilePhosphorIconComponent(icon);
	return IconComponent ? <IconComponent {...props} /> : null;
}

export function mobilePhosphorIconComponent(
	value: string | null | undefined,
): Icon | null {
	const iconKey = mobilePhosphorIconKey(value);
	return iconKey ? (phosphorIconComponents[iconKey] ?? null) : null;
}

export function mobilePhosphorIconKey(
	value: string | null | undefined,
): string | null {
	const normalized = normalizeIconKey(value);
	if (!normalized) return null;

	const alias = phosphorIconAliases[normalized];
	if (alias) return alias;

	return phosphorIconComponents[normalized] ? normalized : null;
}

export function requiredMobilePhosphorIcon(key: string): Icon {
	return phosphorIconComponents[key] ?? phosphorIconComponents.filetext;
}

const phosphorIconAliases: Record<string, string> = {
	alarm: "alarm",
	area: "palette",
	archive: "archive",
	bookbookmark: "bookbookmark",
	calendar: "calendarstar",
	calendarblank: "calendarstar",
	calendarstar: "calendarstar",
	clock: "alarm",
	file: "filetext",
	filetext: "filetext",
	folder: "folderopen",
	folderopen: "folderopen",
	goal: "target",
	inbox: "tray",
	journal: "bookbookmark",
	kalender: "calendarstar",
	kalenderstar: "calendarstar",
	movie: "ticket",
	note: "filetext",
	people: "users",
	person: "users",
	procedure: "stacksimple",
	project: "folderopen",
	quarter: "calendarstar",
	resource: "books",
	resources: "books",
	responsibility: "gear",
	sheet: "calculator",
	stack: "stacksimple",
	stacksimple: "stacksimple",
	termin: "calendarstar",
	time: "alarm",
	tray: "tray",
	uhr: "alarm",
	uhrzeit: "alarm",
	view: "funnel",
	wecker: "alarm",
	year: "lighthouse",
	zeit: "alarm",
};

const phosphorIconComponents = buildPhosphorIconComponents();

function buildPhosphorIconComponents(): Record<string, Icon> {
	return Object.entries(PhosphorIcons).reduce<Record<string, Icon>>(
		(icons, [name, value]) => {
			const key = normalizeIconKey(name);
			if (!key || !isPhosphorIconExport(name, value)) return icons;

			icons[key] = value as Icon;
			if (key.endsWith("icon")) {
				icons[key.slice(0, -4)] ??= value as Icon;
			}
			return icons;
		},
		{},
	);
}

function isPhosphorIconExport(name: string, value: unknown): boolean {
	if (name === "IconContext") return false;
	if (!/^[A-Z]/u.test(name)) return false;
	return (
		typeof value === "function" ||
		(typeof value === "object" && value !== null && "$$typeof" in value)
	);
}
