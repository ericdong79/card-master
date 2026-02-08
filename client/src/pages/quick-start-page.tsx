import { type ComponentType } from "react";
import { BookOpenText, Brain, CircleHelp, Compass, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import { PageTopBar } from "@/components/page-topbar";
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
		<div className="min-h-screen bg-muted/20">
			<PageTopBar
				breadcrumbs={[
					{ label: t("sidebar.nav.cardPacks"), to: "/" },
					{ label: t("sidebar.nav.quickStart") },
				]}
				title={t("quickStart.title")}
				subtitle={t("quickStart.subtitle")}
				actions={
					<div className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground">
						<BookOpenText className="size-4" />
						{t("quickStart.guideTitle")}
					</div>
				}
			/>

			<main className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
				<aside className="h-fit space-y-2 lg:sticky lg:top-6">
					<p className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
						{t("quickStart.guideTitle")}
					</p>
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
											? "border-primary/40 bg-primary/10"
											: "bg-background hover:border-primary/30 hover:bg-muted/50",
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
				</aside>

				<section className="min-w-0 rounded-xl border bg-background p-5 sm:p-6">
					<Outlet />
				</section>
			</main>
		</div>
	);
}
