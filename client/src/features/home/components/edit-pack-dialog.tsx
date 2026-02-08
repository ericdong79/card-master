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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { type CardPackWithCounts } from "@/lib/api/card-pack";

type EditPackDialogProps = {
	editingPack: CardPackWithCounts | null;
	onOpenChange: (open: boolean) => void;
	onEdit: (pack: CardPackWithCounts, name: string) => Promise<void>;
};

export function EditPackDialog({
	editingPack,
	onOpenChange,
	onEdit,
}: EditPackDialogProps) {
	const { t } = useTranslation();
	const [name, setName] = useState("");
	const [pending, setPending] = useState(false);

	useEffect(() => {
		setName(editingPack?.name ?? "");
		setPending(false);
	}, [editingPack]);

	const handleSubmit = async () => {
		if (!editingPack || !name.trim()) return;
		setPending(true);
		try {
			await onEdit(editingPack, name);
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={Boolean(editingPack)} onOpenChange={onOpenChange}>
			<DialogContent className="space-y-4">
				<DialogHeader>
					<DialogTitle>{t("home.editPack.title")}</DialogTitle>
					<DialogDescription>{t("home.editPack.description")}</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="edit-pack-name">{t("home.editPack.name")}</Label>
					<Input
						id="edit-pack-name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder={t("home.editPack.namePlaceholder")}
						autoFocus
					/>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={pending}>
						{pending ? (
							<>
								<Spinner size="sm" className="text-primary-foreground" />
								{t("common.saving")}
							</>
						) : (
							t("common.save")
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
