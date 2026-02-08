import { useEffect, useState } from "react";
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
import { type CardPackWithCounts } from "@/lib/api/card-pack";

type DeletePackDialogProps = {
	deletingPack: CardPackWithCounts | null;
	onOpenChange: (open: boolean) => void;
	onDelete: (pack: CardPackWithCounts) => Promise<void>;
};

export function DeletePackDialog({
	deletingPack,
	onOpenChange,
	onDelete,
}: DeletePackDialogProps) {
	const { t } = useTranslation();
	const [pending, setPending] = useState(false);

	useEffect(() => {
		setPending(false);
	}, [deletingPack]);

	const handleConfirm = async () => {
		if (!deletingPack) return;
		setPending(true);
		try {
			await onDelete(deletingPack);
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={Boolean(deletingPack)} onOpenChange={onOpenChange}>
			<DialogContent className="space-y-4">
				<DialogHeader>
					<DialogTitle>{t("home.deletePack.title")}</DialogTitle>
					<DialogDescription>
						{t("home.deletePack.description")}
					</DialogDescription>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					{t("home.deletePack.confirm", {
						name: deletingPack?.name ?? t("home.deletePack.thisPack"),
					})}
				</p>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
					<Button variant="destructive" onClick={handleConfirm} disabled={pending}>
						{pending ? (
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
