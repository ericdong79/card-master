import { CheckCircle2, Flag, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StepItem = {
	titleKey: string;
	descriptionKey: string;
};

const stepItems: StepItem[] = [
	{
		titleKey: "quickStart.firstStepsPage.steps.1.title",
		descriptionKey: "quickStart.firstStepsPage.steps.1.description",
	},
	{
		titleKey: "quickStart.firstStepsPage.steps.2.title",
		descriptionKey: "quickStart.firstStepsPage.steps.2.description",
	},
	{
		titleKey: "quickStart.firstStepsPage.steps.3.title",
		descriptionKey: "quickStart.firstStepsPage.steps.3.description",
	},
	{
		titleKey: "quickStart.firstStepsPage.steps.4.title",
		descriptionKey: "quickStart.firstStepsPage.steps.4.description",
	},
];

const checklistItems = [
	"quickStart.firstStepsPage.checklist.1",
	"quickStart.firstStepsPage.checklist.2",
	"quickStart.firstStepsPage.checklist.3",
	"quickStart.firstStepsPage.checklist.4",
];

export default function QuickStartFirstStepsPage() {
	const { t } = useTranslation();

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Flag className="size-5" />
						{t("quickStart.firstStepsPage.title")}
					</CardTitle>
					<p className="text-sm text-muted-foreground">{t("quickStart.firstStepsPage.lead")}</p>
				</CardHeader>
				<CardContent className="space-y-3">
					{stepItems.map((item) => (
						<div key={item.titleKey} className="rounded-lg border bg-muted/30 p-4">
							<div className="mb-1 text-sm font-semibold">{t(item.titleKey)}</div>
							<p className="text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
						</div>
					))}
					<Button asChild className="mt-2 w-fit">
						<Link to="/?dialog=create-pack">
							{t("quickStart.firstStepsPage.startCreatePack")}
						</Link>
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<UserPlus className="size-4" />
						{t("quickStart.firstStepsPage.checklistTitle")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{checklistItems.map((key) => (
						<div key={key} className="flex items-start gap-2 text-sm">
							<CheckCircle2 className="mt-0.5 size-4 text-primary" />
							<span>{t(key)}</span>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
