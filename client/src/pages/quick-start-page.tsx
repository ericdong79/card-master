import { useTranslation } from "react-i18next";
import { BookOpenText, Lightbulb, Route } from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function QuickStartPage() {
	const { t } = useTranslation();

	return (
		<div className="mx-auto w-full max-w-4xl px-6 py-8">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-xl">
						<BookOpenText className="size-5" />
						{t("quickStart.title")}
					</CardTitle>
					<CardDescription>{t("quickStart.subtitle")}</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 pb-2 md:grid-cols-2">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="mb-2 flex items-center gap-2 text-sm font-medium">
							<Route className="size-4" />
							{t("quickStart.blocks.usage.title")}
						</div>
						<p className="text-sm text-muted-foreground">
							{t("quickStart.blocks.usage.description")}
						</p>
					</div>
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="mb-2 flex items-center gap-2 text-sm font-medium">
							<Lightbulb className="size-4" />
							{t("quickStart.blocks.principles.title")}
						</div>
						<p className="text-sm text-muted-foreground">
							{t("quickStart.blocks.principles.description")}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
