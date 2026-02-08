import { useEffect, useState } from "react";
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
					<DialogTitle>Delete card pack</DialogTitle>
					<DialogDescription>
						This removes the pack and its cards. This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					Are you sure you want to delete{" "}
					<span className="font-medium text-foreground">
						{deletingPack?.name ?? "this pack"}
					</span>
					?
				</p>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleConfirm} disabled={pending}>
						{pending ? (
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
