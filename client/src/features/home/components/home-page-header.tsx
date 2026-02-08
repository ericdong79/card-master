import { Download, Plus, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageTopBar } from "@/components/page-topbar";
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
		<PageTopBar
			title={t("home.title")}
			subtitle={t("home.subtitle")}
			actions={
				<>
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
				</>
			}
		/>
	);
}
