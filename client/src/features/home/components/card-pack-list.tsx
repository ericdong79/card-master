import { ArrowUpDown, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
	const [searchTerm, setSearchTerm] = useState("");
	const [sortMode, setSortMode] = useState<
		| "createdAtDesc"
		| "createdAtAsc"
		| "nameAsc"
		| "nameDesc"
		| "cardsCountDesc"
		| "cardsCountAsc"
	>("createdAtDesc");

	const filteredAndSortedPacks = useMemo(() => {
		const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
		const filtered = normalizedSearch
			? cardPacks.filter((pack) =>
					pack.name.toLocaleLowerCase().includes(normalizedSearch),
				)
			: cardPacks;

		return [...filtered].sort((a, b) => {
			switch (sortMode) {
				case "createdAtAsc":
					return (
						new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
					);
				case "createdAtDesc":
					return (
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
					);
				case "nameAsc":
					return a.name.localeCompare(b.name);
				case "nameDesc":
					return b.name.localeCompare(a.name);
				case "cardsCountAsc":
					return a.cards_count - b.cards_count;
				case "cardsCountDesc":
					return b.cards_count - a.cards_count;
				default:
					return 0;
			}
		});
	}, [cardPacks, searchTerm, sortMode]);

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

	const hasNoFilteredResults = filteredAndSortedPacks.length === 0;

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder={t("home.controls.searchPlaceholder")}
						className="pl-9"
						aria-label={t("home.controls.searchPlaceholder")}
					/>
				</div>
				<div className="flex items-center gap-2 sm:w-auto">
					<ArrowUpDown className="size-4 text-muted-foreground" />
					<select
						className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-64 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
						value={sortMode}
						onChange={(event) =>
							setSortMode(
								event.target.value as
									| "createdAtDesc"
									| "createdAtAsc"
									| "nameAsc"
									| "nameDesc"
									| "cardsCountDesc"
									| "cardsCountAsc",
							)
						}
						aria-label={t("home.controls.sortLabel")}
					>
						<option value="createdAtDesc">
							{t("home.controls.sort.createdAtDesc")}
						</option>
						<option value="createdAtAsc">
							{t("home.controls.sort.createdAtAsc")}
						</option>
						<option value="nameAsc">{t("home.controls.sort.nameAsc")}</option>
						<option value="nameDesc">{t("home.controls.sort.nameDesc")}</option>
						<option value="cardsCountDesc">
							{t("home.controls.sort.cardsCountDesc")}
						</option>
						<option value="cardsCountAsc">
							{t("home.controls.sort.cardsCountAsc")}
						</option>
					</select>
				</div>
			</div>

			{hasNoFilteredResults ? (
				<Card className="border-dashed bg-background/60">
					<CardHeader>
						<CardTitle>{t("home.controls.noResultsTitle")}</CardTitle>
						<CardDescription>
							{t("home.controls.noResultsDescription")}
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2">
					{filteredAndSortedPacks.map((pack) => (
						<CardPackTile
							key={pack.id}
							pack={pack}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</div>
			)}
		</div>
	);
}
