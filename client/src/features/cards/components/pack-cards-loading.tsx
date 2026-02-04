import { Spinner } from "@/components/ui/spinner";

export function PackCardsLoading() {
	return (
		<div className="flex items-center gap-2 text-muted-foreground">
			<Spinner />
			<span>Loading cards...</span>
		</div>
	);
}
