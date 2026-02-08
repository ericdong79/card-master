import { Brain, Files, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { PageTopBar } from "@/components/page-topbar";
import { Button } from "@/components/ui/button";

type PackCardsHeaderProps = {
	cardPackId: string;
	packName?: string;
	onCreateClick: () => void;
	onBulkCreateClick?: () => void;
	showBulkCreate?: boolean;
	showReviewButton?: boolean;
	dueCardsCount?: number;
};

export function PackCardsHeader({
	cardPackId,
	packName,
	onCreateClick,
	onBulkCreateClick,
	showBulkCreate = false,
	showReviewButton = true,
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
		<PageTopBar
			breadcrumbs={[
				{ label: t("cards.breadcrumbPacks"), to: "/" },
				{ label: packName ?? t("cards.loadingPackName") },
			]}
			actions={
				<>
					{showReviewButton ? (
						<Button
							onClick={handleReviewClick}
							className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground shadow-sm hover:from-primary/95 hover:via-primary/90 hover:to-primary/75"
						>
							<Brain className="size-4" />
							{t("cards.review")}
						</Button>
					) : null}
					{showBulkCreate && onBulkCreateClick ? (
						<Button variant="outline" onClick={onBulkCreateClick}>
							<Files className="size-4" />
							{t("cards.bulkCreate")}
						</Button>
					) : null}
					<Button onClick={onCreateClick}>
						<Plus className="size-4" />
						{t("cards.newCard")}
					</Button>
				</>
			}
		/>
	);
}
