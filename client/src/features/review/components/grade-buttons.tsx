import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReviewGrade } from "@/lib/scheduling/types";

const gradeConfig: { grade: ReviewGrade; label: string; variant?: "default" | "outline" | "destructive" | "secondary" }[] =
	[
		{ grade: "again", label: "Again", variant: "destructive" },
		{ grade: "hard", label: "Hard", variant: "secondary" },
		{ grade: "good", label: "Good", variant: "default" },
		{ grade: "easy", label: "Easy", variant: "outline" },
	];

type GradeButtonsProps = {
	onSelect: (grade: ReviewGrade) => void;
	disabled?: boolean;
	className?: string;
};

export function GradeButtons({ onSelect, disabled, className }: GradeButtonsProps) {
	return (
		<div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
			{gradeConfig.map((config) => (
				<Button
					key={config.grade}
					variant={config.variant}
					disabled={disabled}
					onClick={() => onSelect(config.grade)}
				>
					{config.label}
				</Button>
			))}
		</div>
	);
}
