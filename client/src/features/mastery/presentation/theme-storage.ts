const MASTERY_THEME_KEY_PREFIX = "card-master.mastery.presentation.v1";
const MASTERY_ENABLED_KEY_PREFIX = "card-master.mastery.enabled.v1";

function getStorageKey(ownerUserId: string): string {
	return `${MASTERY_THEME_KEY_PREFIX}.${ownerUserId}`;
}

function getEnabledStorageKey(ownerUserId: string): string {
	return `${MASTERY_ENABLED_KEY_PREFIX}.${ownerUserId}`;
}

export function getMasteryThemePreference(ownerUserId: string): string | null {
	if (typeof window === "undefined") return null;
	return window.localStorage.getItem(getStorageKey(ownerUserId));
}

export function setMasteryThemePreference(ownerUserId: string, pluginId: string): void {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(getStorageKey(ownerUserId), pluginId);
}

export function getMasteryPresentationEnabled(ownerUserId: string): boolean {
	if (typeof window === "undefined") return true;
	const raw = window.localStorage.getItem(getEnabledStorageKey(ownerUserId));
	if (raw == null) return true;
	return raw === "1";
}

export function setMasteryPresentationEnabled(ownerUserId: string, enabled: boolean): void {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(getEnabledStorageKey(ownerUserId), enabled ? "1" : "0");
}
