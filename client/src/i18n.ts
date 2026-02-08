import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/i18n/locales/en.json";
import zhCN from "@/i18n/locales/zh-CN.json";

const resolveInitialLanguage = () => {
	return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
};

void i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		"zh-CN": { translation: zhCN },
	},
	lng: resolveInitialLanguage(),
	fallbackLng: "en",
	supportedLngs: ["en", "zh-CN"],
	interpolation: {
		escapeValue: false,
	},
});

export default i18n;
