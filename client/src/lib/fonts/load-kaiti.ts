import kaitiUrl from "../../assets/fonts/kaiti.woff2";

/**
 * The Kaiti font is ~6.7 MB and only used by pinyin-hanzi cards when the user
 * has explicitly opted into it via their profile (`hanzi_font: "kaiti"`).
 *
 * To keep it off the critical FCP path, we no longer declare it in `index.css`
 * via `@font-face`. Instead, we load it on demand the first time a component
 * that needs it mounts. The promise is memoized so subsequent calls are cheap.
 */

let loadPromise: Promise<void> | null = null;

export function loadKaitiOnce(): Promise<void> {
	if (loadPromise) {
		return loadPromise;
	}

	// Guard for non-browser/test environments where FontFace is unavailable.
	if (
		typeof document === "undefined" ||
		typeof FontFace === "undefined" ||
		!document.fonts
	) {
		loadPromise = Promise.resolve();
		return loadPromise;
	}

	const fontFace = new FontFace("CardMasterKaiTi", `url(${kaitiUrl})`, {
		display: "swap",
	});

	loadPromise = fontFace
		.load()
		.then((loaded) => {
			document.fonts.add(loaded);
		})
		.catch((error) => {
			// Reset so a future caller can retry if the user navigates away
			// and back, e.g. after a transient network failure.
			loadPromise = null;
			throw error;
		});

	return loadPromise;
}
