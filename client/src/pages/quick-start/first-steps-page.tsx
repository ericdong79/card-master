import { CheckCircle2, Flag, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

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
		<div className="space-y-6">
			<section className="space-y-4">
				<div>
					<h2 className="flex items-center gap-2 text-lg font-semibold">
						<Flag className="size-5" />
						{t("quickStart.firstStepsPage.title")}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("quickStart.firstStepsPage.lead")}</p>
				</div>
				<div className="space-y-3">
					{stepItems.map((item) => (
						<div key={item.titleKey} className="rounded-lg border px-4 py-3">
							<div className="mb-1 text-sm font-semibold">{t(item.titleKey)}</div>
							<p className="text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
						</div>
					))}
				</div>
				<Button asChild className="w-fit">
					<Link to="/?dialog=create-pack">
						{t("quickStart.firstStepsPage.startCreatePack")}
					</Link>
				</Button>
			</section>

			<section className="space-y-3 rounded-lg border bg-muted/20 p-4">
				<h3 className="flex items-center gap-2 text-sm font-semibold">
					<UserPlus className="size-4" />
					{t("quickStart.firstStepsPage.checklistTitle")}
				</h3>
				<div className="space-y-2">
					{checklistItems.map((key) => (
						<div key={key} className="flex items-start gap-2 text-sm">
							<CheckCircle2 className="mt-0.5 size-4 text-primary" />
							<span>{t(key)}</span>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
