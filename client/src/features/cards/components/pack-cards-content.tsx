import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Activity, CirclePlay, Clock3, LibraryBig } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CardTypeBadge } from "@/components/card-type-badge";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import { CardList } from "./card-list";

type PackCardsContentProps = {
	packName?: string;
	packType?: CardPackType;
	totalCards?: number;
	learningCards?: number;
	reviewCards?: number;
	dueCards?: number;
	cards: CardEntity[];
	onCreateClick: () => void;
	onEdit: (card: CardEntity) => void;
	onDelete: (card: CardEntity) => void;
};

export function PackCardsContent({
	packName,
	packType,
	totalCards,
	learningCards = 0,
	reviewCards = 0,
	dueCards = 0,
	cards,
	onCreateClick,
	onEdit,
	onDelete,
}: PackCardsContentProps) {
	const { t } = useTranslation();
	const totalCount = totalCards ?? cards.length;

	return (
		<Card>
			<CardHeader className="pb-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<CardTitle className="text-xl">
								{packName ?? t("cards.packFallback")}
							</CardTitle>
							{packType ? <CardTypeBadge type={packType} /> : null}
						</div>
						<CardDescription>{t("cards.subtitle")}</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1">
							<LibraryBig className="size-3.5" />
							{t("cards.summary.total", { count: totalCount })}
						</span>
						<span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1">
							<CirclePlay className="size-3.5" />
							{t("cards.summary.learning", { count: learningCards })}
						</span>
						<span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1">
							<Activity className="size-3.5" />
							{t("cards.summary.review", { count: reviewCards })}
						</span>
						<span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1">
							<Clock3 className="size-3.5" />
							{t("cards.summary.due", { count: dueCards })}
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<CardList
					cards={cards}
					packType={packType}
					onCreateClick={onCreateClick}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			</CardContent>
		</Card>
	);
}
