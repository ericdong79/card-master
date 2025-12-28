import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "../supabase/client";

type UseCurrentUserState = {
	user: User | null;
	userId: string | null;
	loading: boolean;
	error: string | null;
};

export function useCurrentUser(): UseCurrentUserState {
	const supabase = useMemo(() => createClient(), []);
	const [state, setState] = useState<UseCurrentUserState>({
		user: null,
		userId: null,
		loading: true,
		error: null,
	});

	useEffect(() => {
		let isMounted = true;

		const setFromUser = (user: User | null) => {
			if (!isMounted) return;
			setState((prev) => ({
				...prev,
				user,
				userId: user?.id ?? null,
				loading: false,
			}));
		};

		const setError = (message: string) => {
			if (!isMounted) return;
			setState((prev) => ({
				...prev,
				error: message,
				loading: false,
			}));
		};

		supabase.auth
			.getUser()
			.then(({ data, error }) => {
				if (error) {
					setError(error.message);
					return;
				}
				setFromUser(data.user ?? null);
			})
			.catch((err) =>
				setError(err instanceof Error ? err.message : "Failed to fetch user"),
			);

		const { data: authListener } = supabase.auth.onAuthStateChange(
			(_, session) => {
				setFromUser(session?.user ?? null);
			},
		);

		return () => {
			isMounted = false;
			authListener?.subscription.unsubscribe();
		};
	}, [supabase]);

	return state;
}
