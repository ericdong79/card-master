import { Plus } from "lucide-react";
import { IconCards } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";

import { CardRow } from "./card-row";

type CardListProps = {
	cards: CardEntity[];
	packType?: CardPackType;
	dueTimesByCardId?: Record<string, string>;
	masteryByCardId?: Record<string, CardMasteryState>;
	masteryThemeId?: string | null;
	showMastery?: boolean;
	onCreateClick: () => void;
	onEdit: (card: CardEntity) => void;
	onDelete: (card: CardEntity) => void;
};

export function CardList({
	cards,
	packType,
	dueTimesByCardId,
	masteryByCardId,
	masteryThemeId,
	showMastery = true,
	onCreateClick,
	onEdit,
	onDelete,
}: CardListProps) {
	const { t } = useTranslation();

	if (cards.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/60 px-4 py-12 text-sm text-muted-foreground">
				<IconCards className="size-12 text-muted-foreground/50" />
				<div className="text-center">
					<p className="font-medium">{t("cards.emptyTitle")}</p>
					<p className="text-xs">{t("cards.emptyDescription")}</p>
				</div>
				<Button variant="outline" onClick={onCreateClick}>
					<Plus className="size-4" />
					{t("cards.newCard")}
				</Button>
			</div>
		);
	}

	return (
		<div className="grid gap-4">
			{cards.map((card) => (
				<CardRow
					key={card.id}
					card={card}
					packType={packType}
					onEdit={onEdit}
					onDelete={onDelete}
					dueAt={dueTimesByCardId?.[card.id]}
					mastery={masteryByCardId?.[card.id]}
					masteryThemeId={masteryThemeId}
					showMastery={showMastery}
				/>
			))}
		</div>
	);
}
