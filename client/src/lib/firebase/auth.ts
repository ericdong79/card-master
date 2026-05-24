import {
	GoogleAuthProvider,
	getAuth,
	signInWithPopup,
	signOut,
	type Auth,
	type User,
} from "firebase/auth";

import { getFirebaseApp } from "./app";

export function getFirebaseAuth(): Auth {
	return getAuth(getFirebaseApp());
}

export async function signInWithGoogle(): Promise<User> {
	const provider = new GoogleAuthProvider();
	provider.setCustomParameters({ prompt: "select_account" });
	const credential = await signInWithPopup(getFirebaseAuth(), provider);
	return credential.user;
}

export async function signOutOfFirebase(): Promise<void> {
	await signOut(getFirebaseAuth());
}
