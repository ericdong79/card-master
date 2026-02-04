import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { ReviewGrade } from "@/lib/scheduling/types";
import { cn } from "@/lib/utils";
import {
	defaultSimpleButtons,
	defaultSm2Buttons,
	ReviewButtons,
	type ReviewMode,
	type SimpleReviewResult,
} from "./review-buttons";

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
		<Card
			className={cn(
				"flex flex-col",
				"w-full max-w-3xl",
				"h-[600px] max-h-[90vh]",
				className,
			)}
		>
			<CardHeader className="pb-4 space-y-4 shrink-0">
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

			<CardContent className="flex-1 flex flex-col min-h-0">
				{/* Scrollable content area - fixed height flex child */}
				<div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-1">
					{/* Question - always visible */}
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">Question</p>
						<p className="text-lg font-medium leading-relaxed">{card.prompt}</p>
					</div>

					{/* Answer Section - expands with animation */}
					<div
						className={cn(
							"transition-all duration-300 ease-out",
							showAnswer
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-2 h-0 overflow-hidden"
						)}
					>
						<div className="space-y-6 pb-2">
							{/* Answer display */}
							<div className="rounded-lg border bg-muted/40 p-4">
								<p className="text-sm text-muted-foreground mb-2">Answer</p>
								<p className="text-base leading-relaxed">{card.answer}</p>
							</div>
						</div>
					</div>
				</div>

				{/* Bottom section - always at bottom */}
				<div className="shrink-0 pt-4 border-t mt-auto">
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
						<div
							className={cn(
								"space-y-4 transition-all duration-300 ease-out",
								"opacity-100 translate-y-0"
							)}
						>
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
										buttons ?? (defaultSm2Buttons as typeof defaultSm2Buttons)
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
