import { type ComponentType } from "react";
import { BarChart3, Clock3, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

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
		<div className="space-y-6">
			<section className="space-y-4">
				<div>
					<h2 className="text-lg font-semibold">{t("quickStart.memoryCurvePage.title")}</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("quickStart.memoryCurvePage.lead")}</p>
				</div>
				<div className="space-y-3">
					{theoryItems.map((item) => {
						const Icon = item.icon;
						return (
							<div key={item.titleKey} className="rounded-lg border px-4 py-3">
								<div className="mb-1 flex items-center gap-2 text-sm font-semibold">
									<Icon className="size-4" />
									{t(item.titleKey)}
								</div>
								<p className="text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
							</div>
						);
					})}
				</div>
			</section>

			<section className="space-y-3 rounded-lg border bg-muted/20 p-4">
				<h3 className="text-sm font-semibold">{t("quickStart.memoryCurvePage.intervalTitle")}</h3>
				<div className="space-y-2">
					{intervals.map((key) => (
						<p key={key} className="text-sm">
							{t(key)}
						</p>
					))}
				</div>
			</section>
		</div>
	);
}
