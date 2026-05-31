export function getProfileSwitchRedirectPath(pathname: string): string | null {
	return /^\/pack\/[^/]+\/(?:cards|review|quick-review)\/?$/.test(pathname)
		? "/"
		: null;
}
