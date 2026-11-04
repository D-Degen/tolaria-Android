import { describe, expect, it, vi } from "vitest";
import {
  TolariaWidgets,
  WIDGET_DEEP_LINKS,
  type NativeTolariaWidgetsModule,
  type NativeWidgetChecklistItem,
} from "../../modules/tolaria-widgets";

describe("TolariaWidgets & Deep Links", () => {
  it("formats deep link URLs correctly", () => {
    expect(WIDGET_DEEP_LINKS.newNote).toBe("tolaria://open?action=new");
    expect(WIDGET_DEEP_LINKS.voiceCapture).toBe("tolaria://open?action=voice");
    expect(WIDGET_DEEP_LINKS.search).toBe("tolaria://open?action=search");
    expect(WIDGET_DEEP_LINKS.inbox).toBe("tolaria://open?noteId=Inbox.md&phoneState=editor");
  });

  it("formats openNote deep links with optional line numbers and URL encoding", () => {
    expect(WIDGET_DEEP_LINKS.openNote("Inbox.md")).toBe(
      "tolaria://open?noteId=Inbox.md&phoneState=editor"
    );
    expect(WIDGET_DEEP_LINKS.openNote("Daily Note 2026-11-04.md", 42)).toBe(
      "tolaria://open?noteId=Daily%20Note%202026-11-04.md&line=42&phoneState=editor"
    );
    expect(WIDGET_DEEP_LINKS.openNote("Note with spaces & symbols.md")).toBe(
      "tolaria://open?noteId=Note%20with%20spaces%20%26%20symbols.md&phoneState=editor"
    );
  });

  it("handles empty / unlinked native module gracefully", () => {
    expect(TolariaWidgets.getChecklist(null)).toEqual([]);
    expect(TolariaWidgets.updateChecklist([], null)).toBe(false);
    expect(TolariaWidgets.reloadWidgets(null)).toBe(false);
  });

  it("delegates to native module when available", () => {
    const sampleItems: NativeWidgetChecklistItem[] = [
      { id: "1", title: "Task 1", done: false, due: "Today", noteId: "Inbox.md", line: 5 },
      { id: "2", title: "Task 2", done: true, due: null, noteId: "Inbox.md", line: 8 },
    ];

    const mockModule: NativeTolariaWidgetsModule = {
      updateChecklist: vi.fn().mockReturnValue(true),
      getChecklist: vi.fn().mockReturnValue(sampleItems),
      reloadWidgets: vi.fn().mockReturnValue(true),
    };

    expect(TolariaWidgets.updateChecklist(sampleItems, mockModule)).toBe(true);
    expect(mockModule.updateChecklist).toHaveBeenCalledWith(sampleItems);

    expect(TolariaWidgets.getChecklist(mockModule)).toEqual(sampleItems);
    expect(mockModule.getChecklist).toHaveBeenCalled();

    expect(TolariaWidgets.reloadWidgets(mockModule)).toBe(true);
    expect(mockModule.reloadWidgets).toHaveBeenCalled();
  });
});
