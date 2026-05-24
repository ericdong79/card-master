import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

const REQUIRED_FIREBASE_ENV = [
	"VITE_FIREBASE_API_KEY",
	"VITE_FIREBASE_AUTH_DOMAIN",
	"VITE_FIREBASE_PROJECT_ID",
	"VITE_FIREBASE_STORAGE_BUCKET",
	"VITE_FIREBASE_MESSAGING_SENDER_ID",
	"VITE_FIREBASE_APP_ID",
] as const;

type RequiredFirebaseEnv = (typeof REQUIRED_FIREBASE_ENV)[number];

function getRequiredEnv(name: RequiredFirebaseEnv): string {
	const value = import.meta.env[name];
	if (!value) {
		throw new Error(`Missing Firebase environment variable: ${name}`);
	}
	return value;
}

function getRequiredFirebaseEnv(): Record<RequiredFirebaseEnv, string> {
	return Object.fromEntries(
		REQUIRED_FIREBASE_ENV.map((name) => [name, getRequiredEnv(name)]),
	) as Record<RequiredFirebaseEnv, string>;
}

export function getFirebaseApp(): FirebaseApp {
	if (getApps().length > 0) return getApp();

	const env = getRequiredFirebaseEnv();

	return initializeApp({
		apiKey: env.VITE_FIREBASE_API_KEY,
		authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
		projectId: env.VITE_FIREBASE_PROJECT_ID,
		storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
		appId: env.VITE_FIREBASE_APP_ID,
	});
}
