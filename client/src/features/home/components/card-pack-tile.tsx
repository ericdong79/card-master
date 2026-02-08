import { Link } from "react-router-dom";
import { Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { type CardPackWithCounts } from "@/lib/api/card-pack";
import { resolveCardPackType } from "@/lib/api/entities/card-pack";
import { getCardPackTypeLabel } from "@/lib/cards/card-type-registry";
import { cn } from "@/lib/utils";

type CardPackTileProps = {
	pack: CardPackWithCounts;
	onEdit: (pack: CardPackWithCounts) => void;
	onDelete: (pack: CardPackWithCounts) => void;
};

export function CardPackTile({ pack, onEdit, onDelete }: CardPackTileProps) {
	const createdAt = new Date(pack.created_at).toLocaleString();
	const typeLabel = getCardPackTypeLabel(resolveCardPackType(pack.type));

	return (
		<Card className="group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
			<Link to={`/pack/${pack.id}/cards`} className="absolute inset-0" aria-label={pack.name} />
			<div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
				<Button
					size="icon-sm"
					variant="ghost"
					className="bg-background/80 hover:bg-accent"
					onClick={(event) => {
						event.preventDefault();
						onEdit(pack);
					}}
				>
					<Edit3 className="size-4" />
				</Button>
				<Button
					size="icon-sm"
					variant="ghost"
					className="bg-background/80 hover:bg-destructive/10 hover:text-destructive"
					onClick={(event) => {
						event.preventDefault();
						onDelete(pack);
					}}
				>
					<Trash2 className="size-4" />
				</Button>
			</div>
			<CardHeader className={cn("pb-2 pr-24", pack.cards_count === 0 && "pb-4")}>
				<CardTitle className="text-lg">{pack.name}</CardTitle>
				<CardDescription>
					{typeLabel} · {pack.cards_count} cards
				</CardDescription>
			</CardHeader>
			<CardContent className="text-sm text-muted-foreground">
				Created {createdAt}
			</CardContent>
		</Card>
	);
}
