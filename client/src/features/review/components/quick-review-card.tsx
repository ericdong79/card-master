import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { SimpleReviewResult } from "@/lib/review/quick-review-session";

type QuickReviewCardProps = {
	card: CardEntity;
	queuePosition: { index: number; total: number };
	onReview: (result: SimpleReviewResult) => void;
	reviewing?: boolean;
	forgotCount?: number;
};

/**
 * Quick Review Card Component
 * 
 * Simplified review interface with only two options:
 * - Forgot: Didn't remember the answer
 * - Remembered: Successfully recalled the answer
 * 
 * This mode does NOT affect the card's scheduling state.
 */
export function QuickReviewCard({
	card,
	queuePosition,
	onReview,
	reviewing,
	forgotCount,
}: QuickReviewCardProps) {
	const [showAnswer, setShowAnswer] = useState(false);

	const handleReview = (result: SimpleReviewResult) => {
		setShowAnswer(false);
		onReview(result);
	};

	return (
		<Card className="w-full">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg">
						Card {queuePosition.index} of {queuePosition.total}
					</CardTitle>
					{forgotCount !== undefined && forgotCount > 0 && (
						<span className="text-sm text-amber-600">
							{forgotCount} cards to retry
						</span>
					)}
				</div>
				<CardDescription>Quick Review Mode - Self Test</CardDescription>
			</CardHeader>
			
			<CardContent className="space-y-6">
				{/* Prompt */}
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">Question</p>
					<p className="text-lg font-medium">{card.prompt}</p>
				</div>

				{/* Answer Section */}
				<div className="space-y-2">
					{!showAnswer ? (
						<Button
							variant="outline"
							onClick={() => setShowAnswer(true)}
							className="w-full"
							size="lg"
						>
							Show Answer
						</Button>
					) : (
						<div className="space-y-4">
							<div className="rounded-lg border bg-muted/40 p-4">
								<p className="text-sm text-muted-foreground mb-1">Answer</p>
								<p className="text-base">{card.answer}</p>
							</div>

							{/* Review Buttons */}
							<div className="grid grid-cols-2 gap-3">
								<Button
									variant="outline"
									onClick={() => handleReview("forgot")}
									disabled={reviewing}
									size="lg"
									className={cn(
										"border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300",
										"transition-colors"
									)}
								>
									<span className="flex flex-col items-center gap-1">
										<span className="text-lg">😕</span>
										<span>Forgot</span>
										<span className="text-xs text-muted-foreground">Show again</span>
									</span>
								</Button>

								<Button
									onClick={() => handleReview("remembered")}
									disabled={reviewing}
									size="lg"
									className={cn(
										"bg-green-600 hover:bg-green-700",
										"transition-colors"
									)}
								>
									<span className="flex flex-col items-center gap-1">
										<span className="text-lg">✅</span>
										<span>Remembered</span>
										<span className="text-xs text-green-100">Next card</span>
									</span>
								</Button>
							</div>
							
							<p className="text-xs text-center text-muted-foreground">
								Quick review does not affect your study schedule
							</p>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
