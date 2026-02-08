import { Download, Plus, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation();

	return (
		<header className="border-b bg-background/80 backdrop-blur">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
				<div>
					<h1 className="text-2xl font-semibold">{t("home.title")}</h1>
					<p className="text-sm text-muted-foreground">
						{t("home.subtitle")}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={onExportClick}>
						<Download className="size-4" />
						{t("common.export")}
					</Button>
					<Button variant="outline" onClick={onImportClick}>
						<Upload className="size-4" />
						{t("common.import")}
					</Button>
					<Button onClick={onCreateClick}>
						<Plus className="size-4" />
						{t("home.newPack")}
					</Button>
				</div>
			</div>
		</header>
	);
}
