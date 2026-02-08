import { useLayoutEffect, type ReactNode } from "react";

import { useProfile } from "@/features/profile/profile-context";
import { getReadableForegroundColor, isValidHexColor } from "@/lib/theme/color";

const THEME_VARIABLES = [
	"--primary",
	"--primary-foreground",
	"--ring",
	"--sidebar-primary",
	"--sidebar-primary-foreground",
] as const;

function resetProfileTheme(root: HTMLElement) {
	for (const variable of THEME_VARIABLES) {
		root.style.removeProperty(variable);
	}
}

function applyProfileTheme(root: HTMLElement, primaryColor: string) {
	const foreground = getReadableForegroundColor(primaryColor);

	root.style.setProperty("--primary", primaryColor);
	root.style.setProperty("--primary-foreground", foreground);
	root.style.setProperty("--ring", primaryColor);
	root.style.setProperty("--sidebar-primary", primaryColor);
	root.style.setProperty("--sidebar-primary-foreground", foreground);
}

export function ProfileThemeProvider({ children }: { children: ReactNode }) {
	const { currentProfile } = useProfile();

	useLayoutEffect(() => {
		const root = document.documentElement;
		const primaryColor = currentProfile?.primary_color;
		if (!isValidHexColor(primaryColor)) {
			resetProfileTheme(root);
			return;
		}
		applyProfileTheme(root, primaryColor);
	}, [currentProfile?.primary_color]);

	return <>{children}</>;
}
