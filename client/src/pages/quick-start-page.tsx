import { type ComponentType } from "react";
import { BookOpenText, Brain, CircleHelp, Compass, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type QuickStartSection = {
	to: string;
	titleKey: string;
	descriptionKey: string;
	icon: ComponentType<{ className?: string }>;
};

const quickStartSections: QuickStartSection[] = [
	{
		to: "first-steps",
		titleKey: "quickStart.sections.firstSteps.title",
		descriptionKey: "quickStart.sections.firstSteps.description",
		icon: Compass,
	},
	{
		to: "workflow",
		titleKey: "quickStart.sections.workflow.title",
		descriptionKey: "quickStart.sections.workflow.description",
		icon: Workflow,
	},
	{
		to: "memory-curve",
		titleKey: "quickStart.sections.memoryCurve.title",
		descriptionKey: "quickStart.sections.memoryCurve.description",
		icon: Brain,
	},
	{
		to: "faq",
		titleKey: "quickStart.sections.faq.title",
		descriptionKey: "quickStart.sections.faq.description",
		icon: CircleHelp,
	},
];

export default function QuickStartPage() {
	const { t } = useTranslation();

	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-8">
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-xl">
						<BookOpenText className="size-5" />
						{t("quickStart.title")}
					</CardTitle>
					<CardDescription>{t("quickStart.subtitle")}</CardDescription>
				</CardHeader>
			</Card>

			<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
				<Card className="h-fit">
					<CardHeader className="pb-4">
						<CardTitle className="text-base">{t("quickStart.guideTitle")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{quickStartSections.map((section) => {
							const Icon = section.icon;
							return (
								<NavLink
									key={section.to}
									to={section.to}
									className={({ isActive }) =>
										cn(
											"block rounded-lg border px-3 py-3 transition-colors",
											isActive
												? "border-primary/50 bg-primary/10"
												: "hover:border-primary/30 hover:bg-muted/60",
										)
									}
								>
									<div className="mb-1 flex items-center gap-2 text-sm font-medium">
										<Icon className="size-4" />
										{t(section.titleKey)}
									</div>
									<p className="text-xs text-muted-foreground">{t(section.descriptionKey)}</p>
								</NavLink>
							);
						})}
					</CardContent>
				</Card>

				<div className="min-w-0">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
