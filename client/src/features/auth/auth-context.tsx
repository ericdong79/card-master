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
