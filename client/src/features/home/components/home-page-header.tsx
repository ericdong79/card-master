import { Download, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type HomePageHeaderProps = {
	onExportClick: () => void;
	onImportClick: () => void;
	onCreateClick: () => void;
};

export function HomePageHeader({
	onExportClick,
	onImportClick,
	onCreateClick,
}: HomePageHeaderProps) {
	return (
		<header className="border-b bg-background/80 backdrop-blur">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
				<div>
					<h1 className="text-2xl font-semibold">Card Packs</h1>
					<p className="text-sm text-muted-foreground">
						Manage your decks and keep track of what to review.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={onExportClick}>
						<Download className="size-4" />
						Export
					</Button>
					<Button variant="outline" onClick={onImportClick}>
						<Upload className="size-4" />
						Import
					</Button>
					<Button onClick={onCreateClick}>
						<Plus className="size-4" />
						New card pack
					</Button>
				</div>
			</div>
		</header>
	);
}
