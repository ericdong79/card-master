export function generateId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return Array.from({ length: 4 }, () =>
		Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1),
	).join("-");
}

export function nowIso(): string {
	return new Date().toISOString();
}
