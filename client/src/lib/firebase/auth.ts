import {
	GoogleAuthProvider,
	getAuth,
	signInWithPopup,
	signInWithRedirect,
	signOut,
	type Auth,
	type User,
} from "firebase/auth";

import { getFirebaseApp } from "./app";
import {
	clearFirestorePersistence,
	clearLocalAppStorage,
} from "./local-cleanup";

export function getFirebaseAuth(): Auth {
	return getAuth(getFirebaseApp());
}

function shouldFallbackToRedirect(error: unknown): boolean {
	if (!error || typeof error !== "object" || !("code" in error)) {
		return false;
	}

	return [
		"auth/cancelled-popup-request",
		"auth/operation-not-supported-in-this-environment",
		"auth/popup-blocked",
	].includes(String(error.code));
}

export async function signInWithGoogle(): Promise<User> {
	const provider = new GoogleAuthProvider();
	provider.setCustomParameters({ prompt: "select_account" });
	const auth = getFirebaseAuth();

	try {
		const credential = await signInWithPopup(auth, provider);
		return credential.user;
	} catch (error) {
		if (shouldFallbackToRedirect(error)) {
			await signInWithRedirect(auth, provider);
			return await new Promise<User>(() => undefined);
		}

		throw error;
	}
}

export async function signOutOfFirebase(): Promise<void> {
	await signOut(getFirebaseAuth());
	// Clear user-scoped local data so the next user on a shared browser
	// does not see profile names, themes, or import markers from this user.
	clearLocalAppStorage();
	// Best-effort: drop Firestore's IndexedDB cache. Never blocks sign-out.
	await clearFirestorePersistence();
}
