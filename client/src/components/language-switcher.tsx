import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
	const { t, i18n } = useTranslation();

	return (
		<div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 shadow-sm">
			<span className="text-xs text-muted-foreground">{t("language.label")}</span>
			<select
				className="h-7 rounded border border-input bg-background px-2 text-xs"
				value={i18n.language === "zh-CN" ? "zh-CN" : "en"}
				onChange={(event) => {
					void i18n.changeLanguage(event.target.value);
				}}
				aria-label={t("language.label")}
			>
				<option value="en">{t("language.english")}</option>
				<option value="zh-CN">{t("language.chineseSimplified")}</option>
			</select>
		</div>
	);
}
