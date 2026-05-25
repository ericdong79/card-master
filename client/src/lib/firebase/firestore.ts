import {
	getFirestore,
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager,
	type Firestore,
} from "firebase/firestore";

import { getFirebaseApp } from "./app";

export const FIRESTORE_COLLECTIONS = {
	users: "users",
	profiles: "profiles",
	cardPacks: "card_packs",
	cards: "cards",
	schedulingProfiles: "scheduling_profiles",
	cardSchedulingStates: "card_scheduling_states",
	cardMasteryStates: "card_mastery_states",
	reviewEvents: "review_events",
} as const;

let firestoreInstance: Firestore | null = null;

export function getCardMasterFirestore(): Firestore {
	if (firestoreInstance) return firestoreInstance;

	const app = getFirebaseApp();
	try {
		firestoreInstance = initializeFirestore(app, {
			localCache: persistentLocalCache({
				tabManager: persistentMultipleTabManager(),
			}),
		});
	} catch {
		firestoreInstance = getFirestore(app);
	}
	return firestoreInstance;
}
