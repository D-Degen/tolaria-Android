import type { MobileWorkspaceAction } from "../components/workspace/MobileWorkspaceActionSheet";
import type {
	MobileSidebarFolderSelection,
	MobileSidebarItemSelection,
} from "../components/workspace/MobileWorkspaceSidebar";
import type { MobileWorkspaceSuggestionItem } from "../components/workspace/MobileWorkspaceSuggestionListModel";
import type { NativeTableOfContentsProof } from "../qa/nativeTableOfContentsProbe";
import type { MobileNeighborhood } from "../workspace/mobileNeighborhood";
import type { MobileNoteListFilter } from "../workspace/mobileNoteFilters";
import type { MobileNoteReadState } from "../workspace/mobileNoteRead";
import type { MobilePropertyValueKind } from "../workspace/mobilePropertyValues";
import type {
	MobileTypeSchemaProperty,
	MobileTypeSchemaRelationship,
} from "../workspace/mobileTypeDefinitionSchema";
import type { MobileWorkspaceEdit } from "../workspace/mobileWorkspaceEditing.types";
import type {
	MobileEditorBlock,
	MobileNote,
	MobileNoteWidth,
	MobilePropertyValue,
	MobileSidebarIcon,
	MobileTone,
	MobileViewFilterGroup,
	MobileWorkspaceSnapshot,
} from "../workspace/mobileWorkspaceModel";
import type { EditorEditingMode } from "./TabletEditorPanel";
import type {
	NoteCountText,
	NoteId,
	ReadOnlyFormValue,
	SearchQuery,
	SidebarLabel,
} from "./tabletWorkspaceNavigation";

export type TabletPanel = "noteList" | "properties" | "sidebar";
export type MobileActionSheetQaTarget =
	| "addProperty"
	| "addRelationship"
	| "createView"
	| "editProperty"
	| "editTypeSection"
	| "editTypeVisibility"
	| "editView"
	| "search";

export type TabletReadOnlyForm = {
	allNotesShowImages: boolean;
	allNotesShowPdfs: boolean;
	allNotesShowUnsupported: boolean;
	createTitle: ReadOnlyFormValue;
	editingFavoriteNoteId: ReadOnlyFormValue;
	editingFolderPath: ReadOnlyFormValue;
	editingViewId: ReadOnlyFormValue;
	filenameStem: ReadOnlyFormValue;
	folderName: ReadOnlyFormValue;
	folderParentPath: ReadOnlyFormValue;
	folderPath: ReadOnlyFormValue;
	noteIcon: ReadOnlyFormValue;
	noteType: ReadOnlyFormValue;
	targetNoteId: ReadOnlyFormValue;
	primaryDisplayProperties: string[];
	primaryItemId: ReadOnlyFormValue;
	primaryPropertyQuery: ReadOnlyFormValue;
	propertyName: ReadOnlyFormValue;
	propertyValue: ReadOnlyFormValue;
	propertyValueKind: MobilePropertyValueKind;
	relationshipName: ReadOnlyFormValue;
	relationshipNoteRef: ReadOnlyFormValue;
	relationshipNoteTitle: ReadOnlyFormValue;
	typeDisplayProperties: string[];
	typeName: ReadOnlyFormValue;
	typePropertyQuery: ReadOnlyFormValue;
	typeSchemaProperties: MobileTypeSchemaProperty[];
	typeSchemaPropertyName: ReadOnlyFormValue;
	typeSchemaPropertyValue: ReadOnlyFormValue;
	typeSchemaRelationships: MobileTypeSchemaRelationship[];
	typeSchemaRelationshipName: ReadOnlyFormValue;
	typeSchemaRelationshipTargetRef: ReadOnlyFormValue;
	typeSchemaRelationshipTarget: ReadOnlyFormValue;
	typeSectionLabel: ReadOnlyFormValue;
	typeRenameName: ReadOnlyFormValue;
	typeSort: ReadOnlyFormValue;
	typeTemplate: ReadOnlyFormValue;
	typeIcon: ReadOnlyFormValue;
	typeTone: string;
	typeVisible: boolean;
	viewDisplayProperties: string[];
	viewFilters: MobileViewFilterGroup;
	viewIcon: ReadOnlyFormValue;
	viewName: ReadOnlyFormValue;
	viewPropertyQuery: ReadOnlyFormValue;
	viewSort: ReadOnlyFormValue;
	viewTone: string | null;
};

export type TabletWorkspaceChromeProps = {
	activeFolderId: string | null;
	activeItemId: string | null;
	canGoBack: boolean;
	canGoForward: boolean;
	canMoveFavoriteDown: boolean;
	canMoveFavoriteUp: boolean;
	canMoveTypeDown: boolean;
	canMoveTypeUp: boolean;
	canMoveSelectedViewDown: boolean;
	canMoveSelectedViewUp: boolean;
	canMoveViewDown: boolean;
	canMoveViewUp: boolean;
	canRedoWorkspaceEdit: boolean;
	canUndoWorkspaceEdit: boolean;
	canDeleteType: boolean;
	compactTablet: boolean;
	initialCommandPaletteOpen?: boolean;
	commandPaletteProbe?: boolean;
	keyboardShortcutProbe?: boolean;
	defaultPropertiesVisible: boolean;
	defaultSidebarVisible?: boolean;
	exclusiveSidePanels?: boolean;
	propertiesReplaceSidebar?: boolean;
	defaultNoteWidth: MobileNoteWidth | null;
	editorBlocks: MobileEditorBlock[];
	editorBullets: string[];
	initialEditorEditing?: boolean;
	initialEditorEditingMode?: EditorEditingMode;
	layoutProbe?: boolean;
	noteListProperties: string[];
	noteListNeighborhood: MobileNeighborhood | null;
	noteListFilter: MobileNoteListFilter;
	noteListFilterCounts: Record<MobileNoteListFilter, number>;
	noteListFilterVisible: boolean;
	noteListSubtitle: NoteCountText;
	noteListTitle: SidebarLabel;
	notes: MobileNote[];
	onAddProperty: (key?: string) => void;
	onAddRelationship: (key?: string) => void;
	onBulkArchiveNotes: (noteIds: string[], archived: boolean) => void;
	onBulkDeleteNotes: (noteIds: string[]) => void;
	onBulkOrganizeNotes: (noteIds: string[]) => void;
	onChangeNoteType: (typeOverride?: string) => void;
	onChangeNoteTypeInputChange: (value: ReadOnlyFormValue) => void;
	onCloseAction: () => void;
	onCopyFolderPath: () => void;
	onCopyDeepLink: () => void;
	onCopyFilePath: () => void;
	onCopySelectedFolderPath: () => void;
	onCreateFolder: () => void;
	onCreateNote: (titleOverride?: string) => void;
	onCreateSmartNote?: (draft: {
		title: string;
		type: string;
		tags: string[];
		markdownBody: string;
	}) => void;
	onCreateNoteOfType: (typeName: string) => void;
	onCreateRelationshipTarget: () => void;
	onCreateTitleChange: (value: ReadOnlyFormValue) => void;
	onCreateType: () => void;
	onCreateView: () => void;
	onDeleteFolder: () => void;
	onDeleteType: () => void;
	onDeleteView: () => void;
	onDeleteNote: () => void;
	onDeleteSelectedFolder: () => void;
	onExportNoteAsPdf: () => void;
	onEnterNeighborhood: (noteId: NoteId) => void;
	onDeleteProperty: (noteId: NoteId, key: string) => void;
	onEditProperty: (
		noteId: NoteId,
		key: string,
		value: MobilePropertyValue,
	) => void;
	onFilenameStemChange: (value: ReadOnlyFormValue) => void;
	onFolderNameChange: (value: ReadOnlyFormValue) => void;
	onFolderPathChange: (value: ReadOnlyFormValue) => void;
	onGoBack: () => void;
	onGoForward: () => void;
	onMoveFavoriteDown: () => void;
	onMoveFavoriteUp: () => void;
	onMoveNoteToFolder: () => void;
	onMoveTypeDown: () => void;
	onMoveTypeUp: () => void;
	onMoveSelectedViewDown: () => void;
	onMoveSelectedViewUp: () => void;
	onMoveViewDown: () => void;
	onMoveViewUp: () => void;
	onNoteIconChange: (value: ReadOnlyFormValue) => void;
	onOpenChangeNoteType: () => void;
	onOpenChangeNoteTypeForNote?: (note: MobileNote) => void;
	onApplyWorkspaceEdit?: (edit: MobileWorkspaceEdit) => void;
	onOpenCreateChildFolder: () => void;
	onOpenCreateNoteInFolder: () => void;
	onOpenCreateFolder: () => void;
	onOpenCreateNote: () => void;
	onOpenSmartCreateNote?: () => void;
	onOpenCreateType: () => void;
	onOpenCreateTypeWithName: (typeName: string) => void;
	onOpenCreateView: () => void;
	onOpenFindInNote: () => void;
	onOpenFileInDefaultApp: () => void;
	onOpenFolderActions: (selection: MobileSidebarFolderSelection) => void;
	onOpenFavoriteActions: (selection: MobileSidebarItemSelection) => void;
	onOpenMoveNoteToFolder: () => void;
	onOpenPrimaryActions: (selection: MobileSidebarItemSelection) => void;
	onOpenTypeActions: (selection: MobileSidebarItemSelection) => void;
	onOpenTypeVisibility: () => void;
	onOpenViewActions: (selection: MobileSidebarItemSelection) => void;
	onOpenMoreActions: () => void;
	onOpenNativeVault?: () => void;
	onOpenReplaceInNote: () => void;
	onOpenRenameNoteFile: () => void;
	onOpenSetNoteIcon: () => void;
	onInitializeProperties: (noteId: NoteId) => void;
	onOpenSearch: () => void;
	onOpenActionSheetQaTarget: (target: MobileActionSheetQaTarget) => void;
	onOpenTableOfContents: () => void;
	onOpenSmartNotes: () => void;
	onTableOfContentsScrollProof?: (proof: NativeTableOfContentsProof) => void;
	onNoteListFilterChange: (filter: MobileNoteListFilter) => void;
	onPrimaryAllNotesShowImagesChange: (value: boolean) => void;
	onPrimaryAllNotesShowPdfsChange: (value: boolean) => void;
	onPrimaryAllNotesShowUnsupportedChange: (value: boolean) => void;
	onRemoveRelationship: (noteId: NoteId, key: string, ref: string) => void;
	onRenameFolder: () => void;
	onRevealFolder: () => void;
	onRevealSelectedFolder: () => void;
	onRevealFile: () => void;
	onSaveTypeDefinition: () => void;
	onRedoWorkspaceEdit: () => void;
	onReloadVault: () => void;
	onSavePrimaryNoteListProperties: () => void;
	onSaveProperty: () => void;
	onSaveRelationship: () => void;
	onRenameNoteFile: () => void;
	onRenameNoteFileToTitle: () => void;
	onRemoveNoteIcon: () => void;
	onSetNoteIcon: () => void;
	onUpdateNoteContent: (noteId: NoteId, content: string) => void;
	onUpdateNoteTitle?: (noteId: NoteId, title: string) => void;
	onTypeDisplayPropertiesChange: (value: string[]) => void;
	onTypeNameChange: (value: ReadOnlyFormValue) => void;
	onTypeSchemaPropertyAdd: () => void;
	onTypeSchemaPropertyNameChange: (value: ReadOnlyFormValue) => void;
	onTypeSchemaPropertyRemove: (index: number) => void;
	onTypeSchemaPropertyValueChange: (value: ReadOnlyFormValue) => void;
	onTypeSchemaRelationshipAdd: () => void;
	onTypeSchemaRelationshipNameChange: (value: ReadOnlyFormValue) => void;
	onTypeSchemaRelationshipRemove: (index: number) => void;
	onTypeSchemaRelationshipTargetSelect: (
		title: ReadOnlyFormValue,
		ref: ReadOnlyFormValue,
	) => void;
	onTypeSchemaRelationshipTargetChange: (value: ReadOnlyFormValue) => void;
	onTypePropertyQueryChange: (value: ReadOnlyFormValue) => void;
	onTypeRenameNameChange: (value: ReadOnlyFormValue) => void;
	onTypeSectionLabelChange: (value: ReadOnlyFormValue) => void;
	onTypeSortChange: (value: ReadOnlyFormValue) => void;
	onTypeTemplateChange: (value: ReadOnlyFormValue) => void;
	onTypeIconChange: (value: MobileSidebarIcon) => void;
	onTypeToneChange: (value: MobileTone) => void;
	onTypeVisibleChange: (value: boolean) => void;
	onViewIconChange: (value: MobileSidebarIcon) => void;
	onViewFiltersChange: (value: MobileViewFilterGroup) => void;
	onViewDisplayPropertiesChange: (value: string[]) => void;
	onViewNameChange: (value: ReadOnlyFormValue) => void;
	onViewPropertyQueryChange: (value: ReadOnlyFormValue) => void;
	onViewSortChange: (value: ReadOnlyFormValue) => void;
	onViewToneChange: (value: MobileTone) => void;
	onSaveView: () => void;
	onPrimaryDisplayPropertiesChange: (value: string[]) => void;
	onPrimaryPropertyQueryChange: (value: ReadOnlyFormValue) => void;
	onPropertyNameChange: (value: ReadOnlyFormValue) => void;
	onPropertyValueChange: (value: ReadOnlyFormValue) => void;
	onPropertyValueKindChange: (value: MobilePropertyValueKind) => void;
	onRelationshipNameChange: (value: ReadOnlyFormValue) => void;
	onRelationshipNoteSelect: (
		title: ReadOnlyFormValue,
		ref: ReadOnlyFormValue,
	) => void;
	onRelationshipNoteTitleChange: (value: ReadOnlyFormValue) => void;
	onSearchQueryChange: (value: SearchQuery) => void;
	onSelectFolder: (selection: MobileSidebarFolderSelection) => void;
	onSelectNote: (noteId: NoteId) => void;
	onSelectSidebarItem: (selection: MobileSidebarItemSelection) => void;
	onSetArchived: (archived: boolean) => void;
	onSetDefaultNoteWidth: (mode: MobileNoteWidth) => void;
	onSetOrganized: (organized: boolean) => void;
	onToggleFavorite: () => void;
	onToggleNoteFavorite: (noteId: string) => void;
	onToggleNoteWidth: () => void;
	onToggleTypeVisibility: (typeName: string) => void;
	onUndoWorkspaceEdit: () => void;
	openAction: MobileWorkspaceAction | null;
	readOnlyForm: TabletReadOnlyForm;
	searchQuery: SearchQuery;
	selectedNote: MobileNote | null;
	selectedNoteRead: MobileNoteReadState;
	selectedNoteId: string | null;
	sourceIdleSave?: boolean;
	sourceSelectionProbe?: boolean;
	tableOfContentsProbe?: boolean;
	tabletTransitionProbe?: TabletTransitionProbeMode;
	snapshot: MobileWorkspaceSnapshot;
	vaultRootUri: string | null;
	wysiwygAutocompleteProbe?: boolean;
	wysiwygExternalLinkProbe?: boolean;
	wysiwygFormatCommandProbe?: boolean;
	wysiwygInputTransformProbe?: boolean;
	wysiwygMarkdownBlockProbe?: boolean;
	wysiwygMathEditProbe?: boolean;
	wysiwygTableCommandMutationProbe?: boolean;
	wysiwygWikilinkInsertProbe?: boolean;
	typePropertyOptions: string[];
	typeSchemaPropertyNameOptions: string[];
	typeSchemaRelationshipNameOptions: string[];
	typeRelationshipTargetOptions: MobileWorkspaceSuggestionItem[];
	typeSortPropertyOptions: string[];
	primaryPropertyOptions: string[];
	viewPropertyOptions: string[];
	viewSortPropertyOptions: string[];
	wysiwygMutationProbe?: boolean;
};

export type TabletTransitionProbeMode = false | "all" | "properties";
