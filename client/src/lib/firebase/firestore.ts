import { getFirestore, type Firestore } from "firebase/firestore";

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

export function getCardMasterFirestore(): Firestore {
	return getFirestore(getFirebaseApp());
}
