import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export type AuthContextValue = {
	user: User | null;
	accountUserId: string | null;
	ready: boolean;
	error: Error | null;
	signIn: () => Promise<void>;
	signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}
