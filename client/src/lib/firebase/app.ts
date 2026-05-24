import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

const REQUIRED_FIREBASE_ENV = [
	"VITE_FIREBASE_API_KEY",
	"VITE_FIREBASE_AUTH_DOMAIN",
	"VITE_FIREBASE_PROJECT_ID",
	"VITE_FIREBASE_STORAGE_BUCKET",
	"VITE_FIREBASE_MESSAGING_SENDER_ID",
	"VITE_FIREBASE_APP_ID",
] as const;

function getRequiredEnv(name: (typeof REQUIRED_FIREBASE_ENV)[number]): string {
	const value = import.meta.env[name];
	if (!value) {
		throw new Error(`Missing Firebase environment variable: ${name}`);
	}
	return value;
}

export function getFirebaseApp(): FirebaseApp {
	if (getApps().length > 0) return getApp();

	return initializeApp({
		apiKey: getRequiredEnv("VITE_FIREBASE_API_KEY"),
		authDomain: getRequiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
		projectId: getRequiredEnv("VITE_FIREBASE_PROJECT_ID"),
		storageBucket: getRequiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
		messagingSenderId: getRequiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
		appId: getRequiredEnv("VITE_FIREBASE_APP_ID"),
	});
}
