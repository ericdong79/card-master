import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReviewGrade } from "@/lib/scheduling/types";

export type SimpleReviewResult = "forgot" | "remembered";

export type ReviewMode = "simple" | "sm2";

type BaseButtonConfig = {
	label: string;
	icon?: string;
	subLabel?: string;
	className?: string;
};

type SimpleButtonConfig = BaseButtonConfig & {
	result: SimpleReviewResult;
};

type Sm2ButtonConfig = BaseButtonConfig & {
	grade: ReviewGrade;
	variant?: "default" | "outline" | "destructive" | "secondary";
};

type ReviewButtonsProps =
	| {
			mode: "simple";
			buttons: SimpleButtonConfig[];
			onSelect: (result: SimpleReviewResult) => void;
			disabled?: boolean;
			className?: string;
	  }
	| {
			mode: "sm2";
			buttons: Sm2ButtonConfig[];
			onSelect: (grade: ReviewGrade) => void;
			disabled?: boolean;
			className?: string;
	  };

/**
 * Default configurations for review buttons
 */
export const defaultSimpleButtons: SimpleButtonConfig[] = [
	{
		result: "forgot",
		label: "Forgot",
		icon: "😕",
		subLabel: "Show again",
		className: "border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300",
	},
	{
		result: "remembered",
		label: "Remembered",
		icon: "✅",
		subLabel: "Next card",
		className: "bg-green-600 hover:bg-green-700 text-white",
	},
];

export const defaultSm2Buttons: Sm2ButtonConfig[] = [
	{ grade: "again", label: "Again", variant: "destructive", subLabel: "< 1m" },
	{ grade: "hard", label: "Hard", variant: "secondary", subLabel: "2d" },
	{ grade: "good", label: "Good", variant: "default", subLabel: "3d" },
	{ grade: "easy", label: "Easy", variant: "outline", subLabel: "5d" },
];

/**
 * Generic review buttons component supporting multiple modes
 * 
 * @example Simple mode (Quick Review)
 * ```tsx
 * <ReviewButtons
 *   mode="simple"
 *   buttons={defaultSimpleButtons}
 *   onSelect={(result) => console.log(result)}
 * />
 * ```
 * 
 * @example SM-2 mode (Normal Review)
 * ```tsx
 * <ReviewButtons
 *   mode="sm2"
 *   buttons={defaultSm2Buttons}
 *   onSelect={(grade) => console.log(grade)}
 * />
 * ```
 */
export function ReviewButtons(props: ReviewButtonsProps) {
	const { mode, buttons, disabled, className } = props;

	const handleClick = (value: SimpleReviewResult | ReviewGrade) => {
		if (mode === "simple") {
			(props as Extract<ReviewButtonsProps, { mode: "simple" }>).onSelect(
				value as SimpleReviewResult,
			);
		} else {
			(props as Extract<ReviewButtonsProps, { mode: "sm2" }>).onSelect(
				value as ReviewGrade,
			);
		}
	};

	return (
		<div
			className={cn(
				"grid gap-3",
				mode === "simple" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
				className,
			)}
		>
			{buttons.map((config) => {
				const value =
					mode === "simple"
						? (config as SimpleButtonConfig).result
						: (config as Sm2ButtonConfig).grade;

				return (
					<Button
						key={value}
						variant={(config as Sm2ButtonConfig).variant ?? "outline"}
						disabled={disabled}
						onClick={() => handleClick(value)}
						size="lg"
						className={cn(
							"transition-colors",
							config.className,
						)}
					>
						<span className="flex flex-col items-center gap-1">
							{config.icon && <span className="text-lg">{config.icon}</span>}
							<span>{config.label}</span>
							{config.subLabel && (
								<span
									className={cn(
										"text-xs",
										(config as Sm2ButtonConfig).variant === "default" ||
											(config as Sm2ButtonConfig).grade === "remembered"
											? "text-white/80"
											: "text-muted-foreground",
									)}
								>
									{config.subLabel}
								</span>
							)}
						</span>
					</Button>
				);
			})}
		</div>
	);
}
