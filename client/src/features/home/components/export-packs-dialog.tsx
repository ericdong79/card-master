import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { type CardPackWithCounts } from "@/lib/api/card-pack";

type ExportPacksDialogProps = {
	open: boolean;
	cardPacks: CardPackWithCounts[];
	onOpenChange: (open: boolean) => void;
	onExport: (cardPackIds: string[], includeReviewState: boolean) => Promise<void>;
};

export function ExportPacksDialog({
	open,
	cardPacks,
	onOpenChange,
	onExport,
}: ExportPacksDialogProps) {
	const { t } = useTranslation();
	const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
	const [includeReviewState, setIncludeReviewState] = useState(false);
	const [pending, setPending] = useState(false);

	useEffect(() => {
		if (!open) {
			setSelectedPackIds([]);
			setIncludeReviewState(false);
			setPending(false);
			return;
		}

		setSelectedPackIds(cardPacks.map((pack) => pack.id));
	}, [cardPacks, open]);

	const selectedSet = useMemo(() => new Set(selectedPackIds), [selectedPackIds]);

	const togglePack = (packId: string, checked: boolean) => {
		setSelectedPackIds((previous) => {
			if (checked) {
				return previous.includes(packId) ? previous : [...previous, packId];
			}
			return previous.filter((id) => id !== packId);
		});
	};

	const handleSubmit = async () => {
		if (selectedPackIds.length === 0) {
			return;
		}

		setPending(true);
		try {
			await onExport(selectedPackIds, includeReviewState);
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="space-y-4">
				<DialogHeader>
					<DialogTitle>{t("home.exportDialog.title")}</DialogTitle>
					<DialogDescription>
						{t("home.exportDialog.description")}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label>{t("home.exportDialog.selectPacks")}</Label>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => setSelectedPackIds(cardPacks.map((pack) => pack.id))}
							>
								{t("home.exportDialog.all")}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => setSelectedPackIds([])}
							>
								{t("home.exportDialog.none")}
							</Button>
						</div>
					</div>
					<div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
						{cardPacks.map((pack) => (
							<label key={pack.id} className="flex items-center justify-between gap-3">
								<span className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={selectedSet.has(pack.id)}
										onChange={(event) => togglePack(pack.id, event.target.checked)}
										className="size-4 rounded border-input"
									/>
									<span className="text-sm">{pack.name}</span>
								</span>
								<span className="text-xs text-muted-foreground">
									{t("home.exportDialog.packCardsCount", { count: pack.cards_count })}
								</span>
							</label>
						))}
					</div>
				</div>

				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={includeReviewState}
						onChange={(event) => setIncludeReviewState(event.target.checked)}
						className="size-4 rounded border-input"
					/>
					<span>{t("home.exportDialog.includeReviewState")}</span>
				</label>

				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={pending || selectedPackIds.length === 0}>
						{pending ? (
							<>
								<Spinner size="sm" className="text-primary-foreground" />
								{t("common.exporting")}
							</>
						) : (
							t("common.export")
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
