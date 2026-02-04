import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import {
	ReviewButtons,
	defaultSimpleButtons,
	defaultSm2Buttons,
	type ReviewMode,
	type SimpleReviewResult,
} from "./review-buttons";
import type { ReviewGrade } from "@/lib/scheduling/types";

type ReviewCardBaseProps = {
	card: CardEntity;
	packName?: string;
	/** Progress shown as "X learned" (cards marked as remembered/completed at least once) */
	learnedCount: number;
	/** Total cards in the session */
	totalCards: number;
	/** Whether the card is being processed */
	isProcessing?: boolean;
	/** Additional class names */
	className?: string;
};

type SimpleReviewCardProps = ReviewCardBaseProps & {
	mode: "simple";
	onReview: (result: SimpleReviewResult) => void;
	/** Custom button configuration (optional) */
	buttons?: typeof defaultSimpleButtons;
};

type Sm2ReviewCardProps = ReviewCardBaseProps & {
	mode: "sm2";
	onGrade: (grade: ReviewGrade) => void;
	/** Custom button configuration (optional) */
	buttons?: typeof defaultSm2Buttons;
};

type ReviewCardProps = SimpleReviewCardProps | Sm2ReviewCardProps;

/**
 * Unified Review Card Component
 * 
 * Supports both simple (Forgot/Remembered) and SM-2 (Again/Hard/Good/Easy) review modes.
 * 
 * @example Simple mode (Quick Review)
 * ```tsx
 * <ReviewCard
 *   mode="simple"
 *   card={card}
 *   packName="My Pack"
 *   learnedCount={5}
 *   totalCards={10}
 *   onReview={(result) => console.log(result)}
 * />
 * ```
 * 
 * @example SM-2 mode (Normal Review)
 * ```tsx
 * <ReviewCard
 *   mode="sm2"
 *   card={card}
 *   packName="My Pack"
 *   learnedCount={5}
 *   totalCards={10}
 *   onGrade={(grade) => console.log(grade)}
 * />
 * ```
 */
export function ReviewCard(props: ReviewCardProps) {
	const {
		card,
		packName,
		learnedCount,
		totalCards,
		mode,
		isProcessing,
		className,
		buttons,
	} = props;

	const [showAnswer, setShowAnswer] = useState(false);

	const handleAction = (value: SimpleReviewResult | ReviewGrade) => {
		setShowAnswer(false);
		if (mode === "simple") {
			(props as SimpleReviewCardProps).onReview(value as SimpleReviewResult);
		} else {
			(props as Sm2ReviewCardProps).onGrade(value as ReviewGrade);
		}
	};

	return (
		<Card className={cn("w-full", className)}>
			<CardHeader className="pb-4 space-y-4">
				{/* Pack name and mode indicator */}
				<div className="flex items-center justify-between text-sm">
					{packName && (
						<span className="font-medium text-foreground">{packName}</span>
					)}
					<span className="text-muted-foreground">
						{mode === "simple" ? "Quick Review" : "Normal Review"}
					</span>
				</div>

				{/* Progress bar */}
				<div className="space-y-1">
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>Progress</span>
						<span>
							{learnedCount} / {totalCards} learned
						</span>
					</div>
					<div className="h-2 rounded-full bg-muted overflow-hidden">
						<div
							className="h-full bg-primary transition-all duration-300"
							style={{
								width: `${totalCards > 0 ? (learnedCount / totalCards) * 100 : 0}%`,
							}}
						/>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-6">
				{/* Question */}
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">Question</p>
					<p className="text-lg font-medium leading-relaxed">{card.prompt}</p>
				</div>

				{/* Answer Section */}
				<div className="space-y-4">
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
						<div className="space-y-6">
							{/* Answer display */}
							<div className="rounded-lg border bg-muted/40 p-4">
								<p className="text-sm text-muted-foreground mb-2">Answer</p>
								<p className="text-base leading-relaxed">{card.answer}</p>
							</div>

							{/* Review buttons */}
							{mode === "simple" ? (
								<ReviewButtons
									mode="simple"
									buttons={
										buttons ??
										(defaultSimpleButtons as typeof defaultSimpleButtons)
									}
									onSelect={handleAction}
									disabled={isProcessing}
								/>
							) : (
								<ReviewButtons
									mode="sm2"
									buttons={
										buttons ??
										(defaultSm2Buttons as typeof defaultSm2Buttons)
									}
									onSelect={handleAction}
									disabled={isProcessing}
								/>
							)}

							{/* Mode indicator text */}
							<p className="text-xs text-center text-muted-foreground">
								{mode === "simple"
									? "Quick review does not affect your study schedule"
									: "Grades affect the next review interval"}
							</p>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
