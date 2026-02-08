import { ArrowRight, Repeat } from "lucide-react";
import { useTranslation } from "react-i18next";

type WorkflowNode = {
	titleKey: string;
	descriptionKey: string;
};

const workflowNodes: WorkflowNode[] = [
	{
		titleKey: "quickStart.workflowPage.nodes.1.title",
		descriptionKey: "quickStart.workflowPage.nodes.1.description",
	},
	{
		titleKey: "quickStart.workflowPage.nodes.2.title",
		descriptionKey: "quickStart.workflowPage.nodes.2.description",
	},
	{
		titleKey: "quickStart.workflowPage.nodes.3.title",
		descriptionKey: "quickStart.workflowPage.nodes.3.description",
	},
	{
		titleKey: "quickStart.workflowPage.nodes.4.title",
		descriptionKey: "quickStart.workflowPage.nodes.4.description",
	},
	{
		titleKey: "quickStart.workflowPage.nodes.5.title",
		descriptionKey: "quickStart.workflowPage.nodes.5.description",
	},
];

export default function QuickStartWorkflowPage() {
	const { t } = useTranslation();

	return (
		<div className="space-y-6">
			<section className="space-y-4">
				<div>
					<h2 className="flex items-center gap-2 text-lg font-semibold">
						<Repeat className="size-5" />
						{t("quickStart.workflowPage.title")}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("quickStart.workflowPage.lead")}</p>
				</div>
				<div className="grid gap-3 md:grid-cols-2">
					{workflowNodes.map((node, index) => (
						<div key={node.titleKey} className="rounded-lg border px-4 py-3">
							<div className="mb-1 text-sm font-semibold">
								{index + 1}. {t(node.titleKey)}
							</div>
							<p className="text-sm text-muted-foreground">{t(node.descriptionKey)}</p>
						</div>
					))}
				</div>
			</section>

			<section className="flex items-start gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
				<ArrowRight className="mt-0.5 size-4 shrink-0" />
				<p>{t("quickStart.workflowPage.tip")}</p>
			</section>
		</div>
	);
}
