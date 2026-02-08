import { useTranslation } from "react-i18next";
import { SlidersHorizontal, Info } from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function PreferencesPage() {
	const { t } = useTranslation();

	return (
		<div className="mx-auto w-full max-w-4xl px-6 py-8">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-xl">
						<SlidersHorizontal className="size-5" />
						{t("preferences.title")}
					</CardTitle>
					<CardDescription>{t("preferences.subtitle")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="mb-2 text-sm font-medium">
							{t("preferences.blocks.system.title")}
						</div>
						<p className="text-sm text-muted-foreground">
							{t("preferences.blocks.system.description")}
						</p>
					</div>
					<div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-sm">
						<span className="inline-flex items-center gap-2 font-medium">
							<Info className="size-4" />
							{t("preferences.blocks.version.title")}
						</span>
						<span className="font-mono text-muted-foreground">v0.0.0-placeholder</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
