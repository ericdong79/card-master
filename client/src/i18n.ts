import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/i18n/locales/en.json";
import zhCN from "@/i18n/locales/zh-CN.json";

const LANGUAGE_STORAGE_KEY = "card-master.preferences.language";
const SUPPORTED_LANGUAGES = ["en", "zh-CN"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function normalizeLanguage(language: string | null | undefined): AppLanguage | null {
	if (!language) return null;
	if (SUPPORTED_LANGUAGES.includes(language as AppLanguage)) {
		return language as AppLanguage;
	}
	return null;
}

const resolveInitialLanguage = () => {
	if (typeof window !== "undefined") {
		const preferredLanguage = normalizeLanguage(
			window.localStorage.getItem(LANGUAGE_STORAGE_KEY),
		);
		if (preferredLanguage) return preferredLanguage;
	}
	return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
};

void i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		"zh-CN": { translation: zhCN },
	},
	lng: resolveInitialLanguage(),
	fallbackLng: "en",
	supportedLngs: SUPPORTED_LANGUAGES,
	interpolation: {
		escapeValue: false,
	},
});

export async function setPreferredLanguage(nextLanguage: AppLanguage) {
	if (typeof window !== "undefined") {
		window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
	}
	await i18n.changeLanguage(nextLanguage);
}

export default i18n;
