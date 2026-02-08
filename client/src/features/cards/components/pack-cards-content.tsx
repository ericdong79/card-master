import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import { CardList } from "./card-list";

type PackCardsContentProps = {
	packName?: string;
	packType?: CardPackType;
	cards: CardEntity[];
	onEdit: (card: CardEntity) => void;
	onDelete: (card: CardEntity) => void;
};

export function PackCardsContent({
	packName,
	packType,
	cards,
	onEdit,
	onDelete,
}: PackCardsContentProps) {
	const { t } = useTranslation();

	return (
		<Card>
			<CardHeader className="pb-4">
				<CardTitle className="text-xl">{packName ?? t("cards.packFallback")}</CardTitle>
				<CardDescription>{t("cards.count", { count: cards.length })}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<CardList
					cards={cards}
					packType={packType}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			</CardContent>
		</Card>
	);
}
