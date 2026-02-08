import { CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FaqItem = {
	questionKey: string;
	answerKey: string;
};

const faqItems: FaqItem[] = [
	{
		questionKey: "quickStart.faqPage.items.1.question",
		answerKey: "quickStart.faqPage.items.1.answer",
	},
	{
		questionKey: "quickStart.faqPage.items.2.question",
		answerKey: "quickStart.faqPage.items.2.answer",
	},
	{
		questionKey: "quickStart.faqPage.items.3.question",
		answerKey: "quickStart.faqPage.items.3.answer",
	},
	{
		questionKey: "quickStart.faqPage.items.4.question",
		answerKey: "quickStart.faqPage.items.4.answer",
	},
	{
		questionKey: "quickStart.faqPage.items.5.question",
		answerKey: "quickStart.faqPage.items.5.answer",
	},
];

export default function QuickStartFaqPage() {
	const { t } = useTranslation();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					<CircleHelp className="size-5" />
					{t("quickStart.faqPage.title")}
				</CardTitle>
				<p className="text-sm text-muted-foreground">{t("quickStart.faqPage.lead")}</p>
			</CardHeader>
			<CardContent className="space-y-3">
				{faqItems.map((item) => (
					<div key={item.questionKey} className="rounded-lg border bg-muted/20 p-4">
						<div className="mb-1 text-sm font-semibold">{t(item.questionKey)}</div>
						<p className="text-sm text-muted-foreground">{t(item.answerKey)}</p>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
