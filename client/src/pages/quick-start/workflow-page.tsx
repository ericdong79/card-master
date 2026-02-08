import { ArrowRight, Repeat } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Repeat className="size-5" />
						{t("quickStart.workflowPage.title")}
					</CardTitle>
					<p className="text-sm text-muted-foreground">{t("quickStart.workflowPage.lead")}</p>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 md:grid-cols-2">
						{workflowNodes.map((node, index) => (
							<div key={node.titleKey} className="rounded-lg border bg-muted/30 p-4">
								<div className="mb-1 text-sm font-semibold">
									{index + 1}. {t(node.titleKey)}
								</div>
								<p className="text-sm text-muted-foreground">{t(node.descriptionKey)}</p>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
					<ArrowRight className="size-4 shrink-0" />
					<p>{t("quickStart.workflowPage.tip")}</p>
				</CardContent>
			</Card>
		</div>
	);
}
