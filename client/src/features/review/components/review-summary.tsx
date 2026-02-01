import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
	const hasForgotCards = forgotCards.length > 0;
	
	return (
		<Card className="text-center">
			<CardHeader>
				<CardTitle className="text-xl">
					{mode === "quick" ? "Quick review complete" : "Review complete"}
				</CardTitle>
				<CardDescription>
					{packName 
						? `Finished ${mode === "quick" ? "quick review" : "today's cards"} for ${packName}.` 
						: `Finished ${mode === "quick" ? "quick review" : "today's cards"}.`}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="text-sm text-muted-foreground">
					Reviewed {totalReviewed} card{totalReviewed === 1 ? "" : "s"}.
				</div>
				
				{mode === "quick" && hasForgotCards && (
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
						<p className="text-sm font-medium text-amber-800 mb-2">
							⚠️ {forgotCards.length} card{forgotCards.length === 1 ? "" : "s"} you forgot:
						</p>
						<ul className="text-sm text-amber-700 space-y-1">
							{forgotCards.slice(0, 5).map((card) => (
								<li key={card.id} className="truncate">
									• {card.prompt}
								</li>
							))}
							{forgotCards.length > 5 && (
								<li className="text-xs text-amber-600">
									... and {forgotCards.length - 5} more
								</li>
							)}
						</ul>
						<p className="text-xs text-amber-600 mt-2">
							Consider reviewing these cards again or using normal review mode.
						</p>
					</div>
				)}
				
				<div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
					<Button asChild>
						<Link to="/">Back to packs</Link>
					</Button>
					<Button asChild variant="outline">
						<Link to="..">Back to cards</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
