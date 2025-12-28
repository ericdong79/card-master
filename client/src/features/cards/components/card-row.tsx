import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import { Edit3, Trash2 } from "lucide-react";

type CardRowProps = {
	card: CardEntity;
	onEdit: (card: CardEntity) => void;
	onDelete: (card: CardEntity) => void;
};

export function CardRow({ card, onEdit, onDelete }: CardRowProps) {
	return (
		<Card className="group relative transition hover:-translate-y-0.5 hover:shadow-md">
			<div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
				<Button
					size="icon-sm"
					variant="ghost"
					className="bg-background/80 hover:bg-accent"
					onClick={() => onEdit(card)}
					aria-label={`Edit ${card.prompt}`}
				>
					<Edit3 className="size-4" />
				</Button>
				<Button
					size="icon-sm"
					variant="ghost"
					className="bg-background/80 hover:bg-destructive/10 hover:text-destructive"
					onClick={() => onDelete(card)}
					aria-label={`Delete ${card.prompt}`}
				>
					<Trash2 className="size-4" />
				</Button>
			</div>
			<CardHeader className="pb-3 pr-24">
				<CardTitle className="text-base leading-tight">{card.prompt}</CardTitle>
				<CardDescription className={cn("line-clamp-2", !card.answer && "italic")}>
					{card.answer || "No answer provided"}
				</CardDescription>
			</CardHeader>
			<CardContent className="text-xs text-muted-foreground">
				Created {new Date(card.created_at).toLocaleString()}
			</CardContent>
		</Card>
	);
}
