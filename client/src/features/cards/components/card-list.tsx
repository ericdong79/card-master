import { useEffect, useMemo, useState } from "react";
import { IconCards } from "@tabler/icons-react";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import { LOCAL_OWNER_ID } from "@/lib/api/local-user";
import { listSchedulingStatesByCardIds } from "@/lib/api/scheduling-state";
import { useApiClient } from "@/lib/hooks/use-api-client";

import { CardRow } from "./card-row";

type CardListProps = {
	cards: CardEntity[];
	packType?: CardPackType;
	onEdit: (card: CardEntity) => void;
	onDelete: (card: CardEntity) => void;
};

export function CardList({ cards, packType, onEdit, onDelete }: CardListProps) {
	const client = useApiClient();
	const ownerUserId = useMemo(
		() => cards[0]?.owner_user_id ?? LOCAL_OWNER_ID,
		[cards],
	);
	const cardIds = useMemo(() => cards.map((card) => card.id), [cards]);
	const [cardDueTimes, setCardDueTimes] = useState<Record<string, string>>({});

	useEffect(() => {
		let isActive = true;

		if (cardIds.length === 0) {
			return () => {
				isActive = false;
			};
		}

		(async () => {
			const states = await listSchedulingStatesByCardIds(
				client,
				ownerUserId,
				cardIds,
			);
			if (!isActive) return;

			const nextDueTimes = states.reduce<Record<string, string>>(
				(result, state) => {
					result[state.card_id] = state.due_at;
					return result;
				},
				{},
			);

			setCardDueTimes(nextDueTimes);
		})().catch(() => {
			if (isActive) setCardDueTimes({});
		});

		return () => {
			isActive = false;
		};
	}, [cardIds, client, ownerUserId]);

	if (cards.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/60 px-4 py-12 text-sm text-muted-foreground">
				<IconCards className="size-12 text-muted-foreground/50" />
				<div className="text-center">
					<p className="font-medium">No cards yet</p>
					<p className="text-xs">Create one to start practicing</p>
				</div>
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
					dueAt={cardDueTimes?.[card.id]}
				/>
			))}
		</div>
	);
}
