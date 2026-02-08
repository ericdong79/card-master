import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation();
	const questionText = card
		? getCardQuestionText(card) || card.prompt
		: t("cards.deleteDialog.thisCard");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="space-y-4">
				<DialogHeader>
					<DialogTitle>{t("cards.deleteDialog.title")}</DialogTitle>
					<DialogDescription>
						{t("cards.deleteDialog.description")}
					</DialogDescription>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					{t("cards.deleteDialog.confirm", { question: questionText })}
				</p>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
					<Button variant="destructive" onClick={onConfirm} disabled={loading}>
						{loading ? (
							<>
								<Spinner size="sm" className="text-primary-foreground" />
								{t("common.deleting")}
							</>
						) : (
							t("common.delete")
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
