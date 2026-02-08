import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { type CardPackWithCounts } from "@/lib/api/card-pack";
import { CardPackTile } from "./card-pack-tile";

type CardPackListProps = {
	cardPacks: CardPackWithCounts[];
	loading: boolean;
	onCreateClick: () => void;
	onEdit: (pack: CardPackWithCounts) => void;
	onDelete: (pack: CardPackWithCounts) => void;
};

export function CardPackList({
	cardPacks,
	loading,
	onCreateClick,
	onEdit,
	onDelete,
}: CardPackListProps) {
	const { t } = useTranslation();

	if (loading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				<span>{t("home.loadingPacks")}</span>
			</div>
		);
	}

	if (cardPacks.length === 0) {
		return (
			<Card className="border-dashed bg-background/60">
				<CardHeader>
					<CardTitle>{t("home.emptyTitle")}</CardTitle>
					<CardDescription>
						{t("home.emptyDescription")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={onCreateClick}>
						<Plus className="size-4" />
						{t("home.emptyAction")}
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{cardPacks.map((pack) => (
				<CardPackTile
					key={pack.id}
					pack={pack}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}
