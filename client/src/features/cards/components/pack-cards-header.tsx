import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type PackCardsHeaderProps = {
	cardPackId: string;
	packName?: string;
	onCreateClick: () => void;
	onBulkCreateClick?: () => void;
	showBulkCreate?: boolean;
	dueCardsCount?: number;
};

export function PackCardsHeader({
	cardPackId,
	packName,
	onCreateClick,
	onBulkCreateClick,
	showBulkCreate = false,
	dueCardsCount = 0,
}: PackCardsHeaderProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const handleReviewClick = () => {
		if (dueCardsCount === 0) {
			navigate(`/pack/${cardPackId}/quick-review`);
		} else {
			navigate(`/pack/${cardPackId}/review`);
		}
	};

	return (
		<header className="border-b bg-background/80 backdrop-blur">
			<div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Link to="/" className="underline underline-offset-4">
							{t("cards.breadcrumbPacks")}
						</Link>
						<span>/</span>
						<span className="text-foreground">
							{packName ?? t("cards.loadingPackName")}
						</span>
					</div>
					<h1 className="text-2xl font-semibold">{t("cards.title")}</h1>
					<p className="text-sm text-muted-foreground">
						{t("cards.subtitle")}
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={handleReviewClick}>
						{t("cards.review")}
					</Button>
					{showBulkCreate && onBulkCreateClick ? (
						<Button variant="outline" onClick={onBulkCreateClick}>
							{t("cards.bulkCreate")}
						</Button>
					) : null}
					<Button onClick={onCreateClick}>
						<Plus className="size-4" />
						{t("cards.newCard")}
					</Button>
				</div>
			</div>
		</header>
	);
}
