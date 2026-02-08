import { CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";

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
		<div className="space-y-4">
			<div>
				<h2 className="flex items-center gap-2 text-lg font-semibold">
					<CircleHelp className="size-5" />
					{t("quickStart.faqPage.title")}
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">{t("quickStart.faqPage.lead")}</p>
			</div>
			<div className="space-y-3">
				{faqItems.map((item) => (
					<div key={item.questionKey} className="rounded-lg border px-4 py-3">
						<div className="mb-1 text-sm font-semibold">{t(item.questionKey)}</div>
						<p className="text-sm text-muted-foreground">{t(item.answerKey)}</p>
					</div>
				))}
			</div>
		</div>
	);
}
