import {
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from "react";
import { onAuthStateChanged, type Auth, type User } from "firebase/auth";

import { AuthContext, type AuthContextValue } from "@/features/auth/use-auth";
import {
	getFirebaseAuth,
	signInWithGoogle,
	signOutOfFirebase,
} from "@/lib/firebase/auth";
import { clearLocalAppStorage } from "@/lib/firebase/local-cleanup";

type AuthInitState =
	| { auth: Auth; error: null }
	| { auth: null; error: Error };

function getAuthInitState(): AuthInitState {
	try {
		return { auth: getFirebaseAuth(), error: null };
	} catch (initError) {
		console.error("Firebase auth initialization failed", initError);
		return {
			auth: null,
			error:
				initError instanceof Error
					? initError
					: new Error("Firebase auth initialization failed"),
		};
	}
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [authInitState] = useState(getAuthInitState);
	const [user, setUser] = useState<User | null>(null);
	const [ready, setReady] = useState(() => authInitState.auth === null);
	const [error, setError] = useState<Error | null>(() => authInitState.error);

	useEffect(() => {
		if (!authInitState.auth) {
			return;
		}

		const unsubscribe = onAuthStateChanged(
			authInitState.auth,
			(nextUser) => {
				// Cross-tab safety net: if another tab signs out, this tab
				// receives a null user — clear any per-user local data here so
				// it does not survive into a different sign-in. We intentionally
				// do NOT clear Firestore persistence here (Firestore handles
				// per-tab termination and clearing it across tabs would race).
				if (!nextUser) {
					clearLocalAppStorage();
				}
				setUser(nextUser);
				setError(null);
				setReady(true);
			},
			(error) => {
				console.error("Firebase auth state listener failed", error);
				setUser(null);
				setError(error);
				setReady(true);
			},
		);

		return unsubscribe;
	}, [authInitState.auth]);

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			accountUserId: user?.uid ?? null,
			ready,
			error,
			signIn: async () => {
				await signInWithGoogle();
			},
			signOut: signOutOfFirebase,
		}),
		[user, ready, error],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
