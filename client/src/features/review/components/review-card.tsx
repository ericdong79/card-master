import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeButtons } from "./grade-buttons";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { ReviewGrade } from "@/lib/scheduling/types";

type ReviewCardProps = {
	card: CardEntity;
	queuePosition: { index: number; total: number };
	onGrade: (grade: ReviewGrade) => void;
	grading?: boolean;
};

export function ReviewCard({ card, queuePosition, onGrade, grading }: ReviewCardProps) {
	const [showAnswer, setShowAnswer] = useState(false);

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-lg">Card {queuePosition.index + 1} of {queuePosition.total}</CardTitle>
				<CardDescription>Prompt</CardDescription>
				<p className="text-base text-foreground">{card.prompt}</p>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<Button variant="ghost" onClick={() => setShowAnswer((prev) => !prev)}>
						{showAnswer ? "Hide answer" : "Show answer"}
					</Button>
					{showAnswer ? (
						<div className="mt-2 rounded-lg border bg-muted/40 p-3 text-sm text-foreground">
							{card.answer}
						</div>
					) : null}
				</div>
				<div>
					<p className="mb-2 text-sm text-muted-foreground">How did it go?</p>
					<GradeButtons disabled={grading} onSelect={onGrade} />
				</div>
			</CardContent>
		</Card>
	);
}
