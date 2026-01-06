import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type ReviewSummaryProps = {
	packName: string | null;
	totalReviewed: number;
};

export function ReviewSummary({ packName, totalReviewed }: ReviewSummaryProps) {
	return (
		<Card className="text-center">
			<CardHeader>
				<CardTitle className="text-xl">Review complete</CardTitle>
				<CardDescription>
					{packName ? `Finished today's cards for ${packName}.` : "Finished today's cards."}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="text-sm text-muted-foreground">
					Reviewed {totalReviewed} card{totalReviewed === 1 ? "" : "s"}.
				</div>
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
