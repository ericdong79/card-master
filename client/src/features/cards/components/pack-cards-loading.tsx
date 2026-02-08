import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";

export function PackCardsLoading() {
	const { t } = useTranslation();

	return (
		<div className="flex items-center gap-2 text-muted-foreground">
			<Spinner />
			<span>{t("common.loadingCards")}</span>
		</div>
	);
}
