export type NativeWidgetChecklistItem = {
  id: string;
  title: string;
  done?: boolean;
  due?: string | null;
  noteId?: string | null;
  line?: number | null;
};

export const WIDGET_DEEP_LINKS = {
  newNote: 'tolaria://open?action=new',
  voiceCapture: 'tolaria://open?action=voice',
  search: 'tolaria://open?action=search',
  inbox: 'tolaria://open?noteId=Inbox.md&phoneState=editor',
  openNote: (noteId: string, line?: number) =>
    line != null && line >= 0
      ? `tolaria://open?noteId=${encodeURIComponent(noteId)}&line=${line}&phoneState=editor`
      : `tolaria://open?noteId=${encodeURIComponent(noteId)}&phoneState=editor`,
} as const;

export type NativeTolariaWidgetsModule = {
  updateChecklist(items: NativeWidgetChecklistItem[]): boolean;
  getChecklist(): NativeWidgetChecklistItem[];
  reloadWidgets(): boolean;
};

export function optionalTolariaWidgetsModule(): NativeTolariaWidgetsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expo = require('expo');
    return expo?.requireOptionalNativeModule?.('TolariaWidgets') ?? null;
  } catch {
    return null;
  }
}

export const TolariaWidgets = {
  updateChecklist(
    items: NativeWidgetChecklistItem[],
    module: NativeTolariaWidgetsModule | null = optionalTolariaWidgetsModule()
  ): boolean {
    if (!module?.updateChecklist) return false;
    return module.updateChecklist(items);
  },
  getChecklist(
    module: NativeTolariaWidgetsModule | null = optionalTolariaWidgetsModule()
  ): NativeWidgetChecklistItem[] {
    if (!module?.getChecklist) return [];
    return module.getChecklist();
  },
  reloadWidgets(
    module: NativeTolariaWidgetsModule | null = optionalTolariaWidgetsModule()
  ): boolean {
    if (!module?.reloadWidgets) return false;
    return module.reloadWidgets();
  },
};
