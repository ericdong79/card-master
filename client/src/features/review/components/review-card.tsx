import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import { resolveCardPackType } from "@/lib/api/entities/card-pack";
import { getCardAnswerText, getCardQuestionText } from "@/lib/cards/card-type-registry";
import type { ReviewGrade } from "@/lib/scheduling/types";
import type { Sm2Parameters, Sm2State } from "@/lib/scheduling/types/sm2-types";
import { cn } from "@/lib/utils";
import {
	ReviewButtons,
} from "./review-buttons";
import {
	createDefaultSm2Buttons,
	defaultSimpleButtons,
	defaultSm2Buttons,
	type SimpleReviewResult,
} from "./review-buttons-config";

type ReviewCardBaseProps = {
	card: CardEntity;
	packName?: string;
	packType?: CardPackType;
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
};

type Sm2ReviewCardProps = ReviewCardBaseProps & {
	mode: "sm2";
	onGrade: (grade: ReviewGrade) => void;
	/** Current card's SM-2 state for computing dynamic intervals */
	state?: Sm2State | null;
	/** SM-2 parameters */
	params?: Sm2Parameters | null;
};

type ReviewCardProps = SimpleReviewCardProps | Sm2ReviewCardProps;

function QuestionContent({ card, packType }: { card: CardEntity; packType: CardPackType }) {
	const questionText = getCardQuestionText(card);

	return (
		<div className="space-y-3">
			{questionText ? (
				<p className="text-lg font-medium leading-relaxed">{questionText}</p>
			) : null}

			{packType === "image-recall" && card.question_content?.image?.data_url ? (
				<img
					src={card.question_content.image.data_url}
					alt="Question"
					className="max-h-72 rounded-lg border object-contain"
				/>
			) : null}

			{packType === "pinyin-hanzi" && card.question_content?.audio?.data_url ? (
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Pronunciation</p>
					<audio controls src={card.question_content.audio.data_url} />
				</div>
			) : null}
		</div>
	);
}

function AnswerContent({ card, packType }: { card: CardEntity; packType: CardPackType }) {
	const answerText = getCardAnswerText(card);

	if (packType === "pinyin-hanzi") {
		return <HanziAnswerContent answerText={answerText} />;
	}

	return <p className="text-base leading-relaxed">{answerText}</p>;
}

function HanziAnswerContent({ answerText }: { answerText: string }) {
	const characters = Array.from(answerText).filter((char) => char.trim().length > 0);

	if (!characters.length) {
		return <p className="text-base leading-relaxed">{answerText}</p>;
	}

	return (
		<div className="flex flex-wrap gap-2">
			{characters.map((char, index) => (
				<HanziCharacterCell key={`${char}-${index}`} char={char} />
			))}
		</div>
	);
}

function HanziCharacterCell({ char }: { char: string }) {
	return (
		<div
			className="relative flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-sm border bg-background"
			aria-label={`Hanzi character ${char}`}
		>
			<svg
				className="pointer-events-none absolute inset-0 text-border/70"
				viewBox="0 0 100 100"
				aria-hidden="true"
			>
				<line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="1.5" />
				<line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="1.5" />
				<line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1.25" />
				<line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1.25" />
			</svg>
			<span
				className="relative leading-none tracking-wide"
				style={{
					fontSize: "3rem",
					fontFamily: "\"STKaiti\", \"KaiTi\", \"Kaiti SC\", \"Noto Serif SC\", serif",
				}}
			>
				{char}
			</span>
		</div>
	);
}

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
 *   state={sm2State}
 *   params={sm2Params}
 * />
 * ```
 */
export function ReviewCard(props: ReviewCardProps) {
	const {
		card,
		packName,
		packType,
		learnedCount,
		totalCards,
		mode,
		isProcessing,
		className,
	} = props;
	const normalizedPackType = resolveCardPackType(packType);

	const [showAnswer, setShowAnswer] = useState(false);

	const handleAction = (value: SimpleReviewResult | ReviewGrade) => {
		setShowAnswer(false);
		if (mode === "simple") {
			(props as SimpleReviewCardProps).onReview(value as SimpleReviewResult);
		} else {
			(props as Sm2ReviewCardProps).onGrade(value as ReviewGrade);
		}
	};

	const sm2State = mode === "sm2" ? props.state : null;
	const sm2Params = mode === "sm2" ? props.params : null;
	const sm2Buttons =
		mode === "sm2"
			? sm2Params
				? createDefaultSm2Buttons(sm2State ?? null, sm2Params)
				: defaultSm2Buttons
			: null;

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
						<QuestionContent card={card} packType={normalizedPackType} />
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
								<AnswerContent card={card} packType={normalizedPackType} />
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
									buttons={defaultSimpleButtons}
									onSelect={handleAction}
									disabled={isProcessing}
								/>
							) : (
								<ReviewButtons
									mode="sm2"
									buttons={sm2Buttons ?? []}
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
