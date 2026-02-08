import { Brain, Files, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { CardTypeBadge } from "@/components/card-type-badge";
import { Button } from "@/components/ui/button";
import type { CardPackType } from "@/lib/api/entities/card-pack";

type PackCardsHeaderProps = {
	cardPackId: string;
	packName?: string;
	packType?: CardPackType;
	onCreateClick: () => void;
	onBulkCreateClick?: () => void;
	showBulkCreate?: boolean;
	showReviewButton?: boolean;
	dueCardsCount?: number;
};

export function PackCardsHeader({
	cardPackId,
	packName,
	packType,
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
		<header className="border-b bg-background/80 backdrop-blur">
			<div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Link to="/" className="underline underline-offset-4">
						{t("cards.breadcrumbPacks")}
					</Link>
					<span>/</span>
					<span className="text-foreground">
						{packName ?? t("cards.loadingPackName")}
					</span>
					{packType ? <CardTypeBadge type={packType} /> : null}
				</div>
				<div className="flex gap-2">
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
				</div>
			</div>
		</header>
	);
}
