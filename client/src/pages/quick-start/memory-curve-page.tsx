import { type ComponentType } from "react";
import { BarChart3, Clock3, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TheoryItem = {
	titleKey: string;
	descriptionKey: string;
	icon: ComponentType<{ className?: string }>;
};

const theoryItems: TheoryItem[] = [
	{
		titleKey: "quickStart.memoryCurvePage.items.1.title",
		descriptionKey: "quickStart.memoryCurvePage.items.1.description",
		icon: Clock3,
	},
	{
		titleKey: "quickStart.memoryCurvePage.items.2.title",
		descriptionKey: "quickStart.memoryCurvePage.items.2.description",
		icon: BarChart3,
	},
	{
		titleKey: "quickStart.memoryCurvePage.items.3.title",
		descriptionKey: "quickStart.memoryCurvePage.items.3.description",
		icon: ShieldCheck,
	},
];

const intervals = [
	"quickStart.memoryCurvePage.intervals.1",
	"quickStart.memoryCurvePage.intervals.2",
	"quickStart.memoryCurvePage.intervals.3",
	"quickStart.memoryCurvePage.intervals.4",
	"quickStart.memoryCurvePage.intervals.5",
];

export default function QuickStartMemoryCurvePage() {
	const { t } = useTranslation();

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">{t("quickStart.memoryCurvePage.title")}</CardTitle>
					<p className="text-sm text-muted-foreground">{t("quickStart.memoryCurvePage.lead")}</p>
				</CardHeader>
				<CardContent className="space-y-3">
					{theoryItems.map((item) => {
						const Icon = item.icon;
						return (
							<div key={item.titleKey} className="rounded-lg border bg-muted/30 p-4">
								<div className="mb-1 flex items-center gap-2 text-sm font-semibold">
									<Icon className="size-4" />
									{t(item.titleKey)}
								</div>
								<p className="text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
							</div>
						);
					})}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("quickStart.memoryCurvePage.intervalTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{intervals.map((key) => (
						<p key={key} className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
							{t(key)}
						</p>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
