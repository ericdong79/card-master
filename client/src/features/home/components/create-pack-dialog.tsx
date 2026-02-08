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
import {
	DEFAULT_CARD_PACK_TYPE,
	type CardPackType,
} from "@/lib/api/entities/card-pack";
import { cn } from "@/lib/utils";

type CreatePackDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (name: string, type: CardPackType) => Promise<void>;
};

export function CreatePackDialog({
	open,
	onOpenChange,
	onCreate,
}: CreatePackDialogProps) {
	const { t } = useTranslation();
	const [name, setName] = useState("");
	const [type, setType] = useState<CardPackType>(DEFAULT_CARD_PACK_TYPE);
	const [pending, setPending] = useState(false);

	useEffect(() => {
		if (!open) {
			setName("");
			setType(DEFAULT_CARD_PACK_TYPE);
			setPending(false);
		}
	}, [open]);

	const handleSubmit = async () => {
		if (!name.trim()) return;
		setPending(true);
		try {
			await onCreate(name, type);
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="space-y-4">
				<DialogHeader>
					<DialogTitle>{t("home.createPack.title")}</DialogTitle>
					<DialogDescription>{t("home.createPack.description")}</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="new-pack-name">{t("home.createPack.name")}</Label>
					<Input
						id="new-pack-name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder={t("home.createPack.namePlaceholder")}
						autoFocus
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="new-pack-type">{t("home.createPack.type")}</Label>
					<select
						id="new-pack-type"
						value={type}
						onChange={(event) => setType(event.target.value as CardPackType)}
						className={cn(
							"border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm",
							"focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
						)}
					>
						<option value="basic">{t("cardType.basic")}</option>
						<option value="image-recall">{t("cardType.imageRecall")}</option>
						<option value="pinyin-hanzi">{t("cardType.pinyinHanzi")}</option>
					</select>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={pending}>
						{pending ? (
							<>
								<Spinner size="sm" className="text-primary-foreground" />
								{t("common.creating")}
							</>
						) : (
							t("common.create")
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
