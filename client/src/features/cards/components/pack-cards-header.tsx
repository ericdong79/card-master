import { Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type PackCardsHeaderProps = {
	cardPackId: string;
	packName?: string;
	onCreateClick: () => void;
	onBulkCreateClick?: () => void;
	showBulkCreate?: boolean;
	dueCardsCount?: number;
};

export function PackCardsHeader({
	cardPackId,
	packName,
	onCreateClick,
	onBulkCreateClick,
	showBulkCreate = false,
	dueCardsCount = 0,
}: PackCardsHeaderProps) {
	const navigate = useNavigate();

	const handleReviewClick = () => {
		if (dueCardsCount === 0) {
			navigate(`/pack/${cardPackId}/quick-review`);
		} else {
			navigate(`/pack/${cardPackId}/review`);
		}
	};

	return (
		<header className="border-b bg-background/80 backdrop-blur">
			<div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Link to="/" className="underline underline-offset-4">
							Card packs
						</Link>
						<span>/</span>
						<span className="text-foreground">{packName ?? "Loading..."}</span>
					</div>
					<h1 className="text-2xl font-semibold">Cards</h1>
					<p className="text-sm text-muted-foreground">
						View and manage cards in this pack.
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={handleReviewClick}>
						Review
					</Button>
					{showBulkCreate && onBulkCreateClick ? (
						<Button variant="outline" onClick={onBulkCreateClick}>
							Bulk create
						</Button>
					) : null}
					<Button onClick={onCreateClick}>
						<Plus className="size-4" />
						New card
					</Button>
				</div>
			</div>
		</header>
	);
}
