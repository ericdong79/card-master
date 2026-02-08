import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
	return (
		<Card>
			<CardHeader className="pb-4">
				<CardTitle className="text-xl">{packName ?? "Card pack"}</CardTitle>
				<CardDescription>{cards.length} cards</CardDescription>
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
