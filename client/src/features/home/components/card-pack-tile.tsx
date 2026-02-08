import { Edit3, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CardTypeBadge } from "@/components/card-type-badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { CardPackWithCounts } from "@/lib/api/card-pack";
import { cn } from "@/lib/utils";

type CardPackTileProps = {
	pack: CardPackWithCounts;
	onEdit: (pack: CardPackWithCounts) => void;
	onDelete: (pack: CardPackWithCounts) => void;
};

export function CardPackTile({ pack, onEdit, onDelete }: CardPackTileProps) {
	const { t, i18n } = useTranslation();

	return (
		<Card className="group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
			<Link
				to={`/pack/${pack.id}/cards`}
				className="absolute inset-0"
				aria-label={pack.name}
			/>
			<CardHeader className={cn("pb-2", pack.cards_count === 0 && "pb-4")}>
				<div className="flex items-center justify-between gap-2">
					<CardTitle className="text-lg">{pack.name}</CardTitle>
					<CardTypeBadge type={pack.type} />
				</div>
				<CardDescription>
					{t("home.cardsCount", { count: pack.cards_count })}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex items-end justify-between gap-3 items-center text-sm text-muted-foreground">
				<span>
					{t("home.createdAt", {
						date: new Date(pack.created_at).toLocaleString(i18n.language),
					})}
				</span>
				<div className="card-pack-tile-actions relative z-10 ml-auto flex items-center gap-1 transition-opacity">
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
			</CardContent>
		</Card>
	);
}
