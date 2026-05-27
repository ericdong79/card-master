/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useContext } from "react";

export type AppShellModals = {
	openUserMenu: () => void;
	closeUserMenu: () => void;
	openSwitchProfile: () => void;
	openCreateProfile: () => void;
	openLocalImport: () => void;
};

const AppShellModalsContext = createContext<AppShellModals | null>(null);

export function AppShellModalsProvider({
	value,
	children,
}: {
	value: AppShellModals;
	children: ReactNode;
}) {
	return (
		<AppShellModalsContext.Provider value={value}>
			{children}
		</AppShellModalsContext.Provider>
	);
}

export function useAppShellModals(): AppShellModals {
	const ctx = useContext(AppShellModalsContext);
	if (!ctx) {
		throw new Error(
			"useAppShellModals must be used within AppShellModalsProvider",
		);
	}
	return ctx;
}
