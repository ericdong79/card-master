import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Card as CardEntity } from "@/lib/api/entities/card";

type ReviewSummaryProps = {
	packName: string | null;
	totalReviewed: number;
	mode?: "normal" | "quick";
	forgotCards?: CardEntity[];
};

export function ReviewSummary({ 
	packName, 
	totalReviewed, 
	mode = "normal",
	forgotCards = []
}: ReviewSummaryProps) {
	const { t } = useTranslation();
	const hasForgotCards = forgotCards.length > 0;
	
	return (
		<Card className="text-center">
			<CardHeader>
				<CardTitle className="text-xl">
					{mode === "quick" ? t("review.summary.quickComplete") : t("review.summary.complete")}
				</CardTitle>
				<CardDescription>
					{packName 
						? t("review.summary.withPack", {
								modeText:
									mode === "quick"
										? t("review.summary.modeQuick")
										: t("review.summary.modeNormal"),
								packName,
							})
						: t("review.summary.withoutPack", {
								modeText:
									mode === "quick"
										? t("review.summary.modeQuick")
										: t("review.summary.modeNormal"),
							})}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="text-sm text-muted-foreground">
					{t("review.summary.reviewedCount", { value: totalReviewed })}
				</div>
				
				{mode === "quick" && hasForgotCards && (
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
						<p className="text-sm font-medium text-amber-800 mb-2">
							{t("review.summary.forgotTitle", { value: forgotCards.length })}
						</p>
						<ul className="text-sm text-amber-700 space-y-1">
							{forgotCards.slice(0, 5).map((card) => (
								<li key={card.id} className="truncate">
									• {card.prompt}
								</li>
							))}
							{forgotCards.length > 5 && (
								<li className="text-xs text-amber-600">
									{t("review.summary.andMore", { value: forgotCards.length - 5 })}
								</li>
							)}
						</ul>
						<p className="text-xs text-amber-600 mt-2">
							{t("review.summary.forgotHint")}
						</p>
					</div>
				)}
				
				<div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
					<Button asChild>
						<Link to="/">{t("review.summary.backToPacks")}</Link>
					</Button>
					<Button asChild variant="outline">
						<Link to="..">{t("review.summary.backToCards")}</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
