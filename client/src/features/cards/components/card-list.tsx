import type { Card as CardEntity } from "@/lib/api/entities/card";

import { CardRow } from "./card-row";

type CardListProps = {
	cards: CardEntity[];
	onEdit: (card: CardEntity) => void;
	onDelete: (card: CardEntity) => void;
};

export function CardList({ cards, onEdit, onDelete }: CardListProps) {
	if (cards.length === 0) {
		return (
			<div className="rounded-lg border border-dashed bg-background/60 px-4 py-6 text-sm text-muted-foreground">
				No cards yet. Create one to start practicing.
			</div>
		);
	}

	return (
		<div className="grid gap-4">
			{cards.map((card) => (
				<CardRow key={card.id} card={card} onEdit={onEdit} onDelete={onDelete} />
			))}
		</div>
	);
}
