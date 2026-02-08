import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type HomePageHeaderProps = {
	onCreateClick: () => void;
};

export function HomePageHeader({ onCreateClick }: HomePageHeaderProps) {
	return (
		<header className="border-b bg-background/80 backdrop-blur">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
				<div>
					<h1 className="text-2xl font-semibold">Card Packs</h1>
					<p className="text-sm text-muted-foreground">
						Manage your decks and keep track of what to review.
					</p>
				</div>
				<Button onClick={onCreateClick}>
					<Plus className="size-4" />
					New card pack
				</Button>
			</div>
		</header>
	);
}
