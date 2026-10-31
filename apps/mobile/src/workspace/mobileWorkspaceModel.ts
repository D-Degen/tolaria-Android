import type {
	FilterCondition,
	FilterGroup,
	FilterNode,
	FilterOp,
	ViewDefinition,
} from "../../../../src/utils/viewSchema";

export type MobileTone =
	| "blue"
	| "gray"
	| "green"
	| "orange"
	| "purple"
	| "red"
	| "yellow";
export type MobileNoteWidth = "normal" | "wide";
export type MobileFileKind = "binary" | "markdown" | "text";

export type MobileNoteChecklistItem = {
	checked: boolean;
	due: string | null;
	time?: string | null;
	line: number;
	text: string;
};

export type MobileNote = {
	aliases?: string[];
	archived?: boolean;
	created: string;
	createdAt?: number | null;
	date: string;
	editorBlocks?: MobileEditorBlock[];
	editorBullets?: string[];
	favorite: boolean;
	favoriteIndex?: number | null;
	fileKind?: MobileFileKind;
	id: string;
	links: number;
	modified: string;
	modifiedAt?: number | null;
	icon?: string | null;
	noteWidth?: MobileNoteWidth | null;
	organized?: boolean;
	outgoingLinks?: string[];
	path?: string;
	properties?: MobileProperty[];
	rawContent?: string;
	relationships: MobileRelationship[];
	status: string;
	snippet: string;
	tags: string[];
	taskItems?: MobileNoteChecklistItem[];
	title: string;
	type: string;
	typeTone: MobileTone;
	workspace: string;
	workspaceAlias?: string | null;
};

export type MobileRelationshipKind =
	| "belongsTo"
	| "has"
	| "relatedTo"
	| "custom";

export type MobileRelationship = {
	kind: MobileRelationshipKind;
	key?: string;
	label?: string;
	values: MobileRelationshipValue[];
};

export type MobileRelationshipValue = {
	id?: string;
	ref?: string;
	title: string;
	type: string;
	typeTone: MobileTone;
};

export type MobilePropertyValue = string | number | boolean | string[];
export type MobilePropertyDisplayMode =
	| "boolean"
	| "color"
	| "date"
	| "number"
	| "status"
	| "tags"
	| "text"
	| "url";

export type MobileProperty = {
	key: string;
	label: string;
	value: MobilePropertyValue;
};

export type MobileTypeDefinition = {
	color?: string | null;
	icon?: string | null;
	label?: string | null;
	listPropertiesDisplay?: string[];
	order?: number | null;
	path?: string;
	properties?: Record<string, MobilePropertyValue>;
	relationships?: Record<string, string[]>;
	rawContent?: string;
	sort?: string | null;
	template?: string | null;
	tone?: MobileTone | null;
	view?: string | null;
	visible?: boolean | null;
};

export type MobileTypeDefinitions = Record<string, MobileTypeDefinition>;

export type MobileSidebarIcon = string;

export type MobileSidebarItem = {
	active?: boolean;
	count?: string;
	icon: MobileSidebarIcon;
	id: string;
	label: string;
	noteId?: string;
	tone?: MobileTone;
	typeName?: string;
	viewId?: string;
};

export type MobileSidebarSection = {
	count?: string;
	folders?: MobileSidebarFolder[];
	id: string;
	items?: MobileSidebarItem[];
	label?: string;
};

export type MobileSidebarFolder = {
	active?: boolean;
	children: MobileSidebarFolder[];
	expanded?: boolean;
	id: string;
	name: string;
};

export type MobileSyncStatus = {
	kind:
		| "conflict"
		| "noVault"
		| "pullRequired"
		| "readOnly"
		| "synced"
		| "writeFailed";
	minutesAgo?: number;
};

export type MobileEditorInline = {
	bold?: boolean;
	code?: boolean;
	italic?: boolean;
	linkHref?: string;
	strike?: boolean;
	text: string;
	wikilinkTarget?: string;
};

export type MobileEditorHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type MobileEditorListItem = {
	content: MobileEditorInline[];
	depth?: number;
};

export type MobileEditorOrderedListItem = MobileEditorListItem & {
	marker: string;
};

export type MobileEditorTaskItem = MobileEditorListItem & {
	checked: boolean;
};

export type MobileEditorBlock =
	| { content: MobileEditorInline[]; kind: "paragraph" }
	| { kind: "heading"; level: MobileEditorHeadingLevel; text: string }
	| { items: MobileEditorListItem[]; kind: "bullets" }
	| { items: MobileEditorOrderedListItem[]; kind: "orderedList" }
	| { items: MobileEditorTaskItem[]; kind: "tasks" }
	| { content: MobileEditorInline[]; kind: "quote" }
	| { code: string; kind: "codeBlock"; language?: string | null }
	| { kind: "divider" }
	| { headers: string[]; kind: "table"; rows: string[][] };

export type MobileViewFilterOp = FilterOp;
export type MobileViewFilterCondition = FilterCondition;
export type MobileViewFilterGroup = FilterGroup;
export type MobileViewFilterNode = FilterNode;
export type MobileViewDefinition = ViewDefinition;

export type MobileCreateNoteDefaults = {
	archived?: boolean;
	favorite?: boolean;
	folderPath?: string;
	organized?: boolean;
	properties?: Record<string, MobilePropertyValue>;
	relationships?: Record<string, string[]>;
	status?: string;
	tags?: string[];
	template?: string;
	type?: string;
};

export type MobileSavedView = {
	definition: MobileViewDefinition;
	filename: string;
	id: string;
};

export type MobilePrimaryNoteListPropertyOverrides = {
	allNotes?: string[];
	inbox?: string[];
};

export type MobileAllNotesFileVisibility = {
	images: boolean;
	pdfs: boolean;
	unsupported: boolean;
};

export type MobileVaultPrimaryNoteListConfig = {
	explicitOrganization?: boolean;
	fileVisibility?: MobileAllNotesFileVisibility;
	noteListProperties?: string[] | null;
};

export type MobileVaultConfig = {
	allNotes?: MobileVaultPrimaryNoteListConfig | null;
	defaultNoteWidth?: MobileNoteWidth | null;
	inbox?: MobileVaultPrimaryNoteListConfig | null;
	propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null;
};

export type MobileWorkspaceSnapshot = {
	allNotes?: MobileNote[];
	editorBlocks: MobileEditorBlock[];
	editorBullets: string[];
	folderPaths?: string[];
	noteListPropertyOverrides?: MobilePrimaryNoteListPropertyOverrides;
	noteListSubtitle: string;
	notes: MobileNote[];
	searchQuery?: string;
	selectedNoteId?: string;
	sidebarSections: MobileSidebarSection[];
	source?: MobileWorkspaceSource;
	sync: MobileSyncStatus;
	typeDefinitions?: MobileTypeDefinitions;
	vaultConfig?: MobileVaultConfig;
	views?: MobileSavedView[];
};

export type MobileWorkspaceSource = {
	alias?: string | null;
	kind: "fixture" | "localVault";
	label: string;
	totalNotes: number;
	vaultPath?: string;
	visibleNotes: number;
};
