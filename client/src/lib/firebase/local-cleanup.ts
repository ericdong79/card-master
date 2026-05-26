/**
 * Local storage cleanup for sign-out. Removes user-scoped data from
 * `localStorage` so a subsequent sign-in on a shared browser does not leak
 * profile names, per-user theme preferences, or import completion markers.
 *
 * Also clears Firestore's IndexedDB persistence cache so locally-cached
 * documents from the previous user are not visible to the next user.
 */

import {
	clearIndexedDbPersistence,
	terminate,
} from "firebase/firestore";

import { getCardMasterFirestore } from "./firestore";

const APP_STORAGE_PREFIX = "card-master.";

/**
 * Keys that are device-level preferences (not user data) and should survive
 * a sign-out. Adding to this list is a deliberate decision — anything
 * user-identifying must NOT live here.
 */
const PRESERVED_STORAGE_KEYS = new Set<string>([
	"card-master.preferences.language",
	"card-master.preferences.system.v1",
]);

/**
 * Remove all `card-master.*` localStorage entries except those explicitly
 * preserved as device-level preferences.
 */
export function clearLocalAppStorage(): void {
	if (typeof window === "undefined") return;

	const storage = window.localStorage;
	const keysToRemove: string[] = [];

	for (let i = 0; i < storage.length; i += 1) {
		const key = storage.key(i);
		if (!key) continue;
		if (!key.startsWith(APP_STORAGE_PREFIX)) continue;
		if (PRESERVED_STORAGE_KEYS.has(key)) continue;
		keysToRemove.push(key);
	}

	for (const key of keysToRemove) {
		try {
			storage.removeItem(key);
		} catch (error) {
			console.warn(`Failed to clear localStorage key ${key}`, error);
		}
	}
}

/**
 * Best-effort clear of Firestore's IndexedDB persistence cache. Terminating
 * Firestore first is required before `clearIndexedDbPersistence` will run.
 * Failures are logged but never thrown — sign-out must not be blocked by
 * cache-clearing issues.
 */
export async function clearFirestorePersistence(): Promise<void> {
	try {
		const db = getCardMasterFirestore();
		await terminate(db);
		await clearIndexedDbPersistence(db);
	} catch (error) {
		console.warn("Failed to clear Firestore IndexedDB persistence", error);
	}
}
