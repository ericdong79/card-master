import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import { getCardQuestionText } from "@/lib/cards/card-type-registry";

type DeleteCardDialogProps = {
	card: CardEntity | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
	loading?: boolean;
};

export function DeleteCardDialog({
	card,
	open,
	onOpenChange,
	onConfirm,
	loading = false,
}: DeleteCardDialogProps) {
	const questionText = card ? getCardQuestionText(card) || card.prompt : "this card";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="space-y-4">
				<DialogHeader>
					<DialogTitle>Delete card</DialogTitle>
					<DialogDescription>
						This will remove the card permanently. This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					Are you sure you want to delete{" "}
					<span className="font-medium text-foreground">
						{questionText}
					</span>
					?
				</p>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onConfirm} disabled={loading}>
						{loading ? (
							<>
								<Spinner size="sm" className="text-primary-foreground" />
								Deleting...
							</>
						) : (
							"Delete"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
