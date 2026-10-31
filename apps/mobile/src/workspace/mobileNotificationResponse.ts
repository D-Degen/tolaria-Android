export function extractNotificationTargetNoteId(
	response: unknown,
): string | null {
	if (!response || typeof response !== "object") return null;
	const notif = (response as { notification?: unknown }).notification;
	if (!notif || typeof notif !== "object") return null;
	const request = (notif as { request?: unknown }).request;
	if (!request || typeof request !== "object") return null;
	const content = (request as { content?: unknown }).content;
	if (!content || typeof content !== "object") return null;
	const data = (content as { data?: unknown }).data;
	if (!data || typeof data !== "object") return null;
	const noteId = (data as { noteId?: unknown }).noteId;
	if (typeof noteId === "string" && noteId.trim().length > 0) {
		return noteId.trim();
	}
	const url = (data as { url?: unknown }).url;
	if (typeof url === "string") {
		const match = /[?&]noteId=([^&#]+)/.exec(url);
		if (match?.[1]) {
			return decodeURIComponent(match[1]).trim() || null;
		}
	}
	return null;
}
