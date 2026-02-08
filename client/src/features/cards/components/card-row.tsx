import {
	IconCalendar,
	IconClock,
	IconPencil,
	IconTrash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import {
	getCardAnswerText,
	getCardQuestionText,
} from "@/lib/cards/card-type-registry";
import { cn } from "@/lib/utils";

type CardRowProps = {
	card: CardEntity;
	packType?: CardPackType;
	onEdit: (card: CardEntity) => void;
	onDelete: (card: CardEntity) => void;
	dueAt?: string;
};

function formatDueTime(dueAt: string): string {
	const due = new Date(dueAt);
	const now = new Date();
	const diffMs = due.getTime() - now.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffMinutes = Math.floor(diffMs / (1000 * 60));

	if (diffMs < 0) {
		return "Overdue";
	}
	if (diffDays > 0) {
		return `${diffDays}d`;
	}
	if (diffHours > 0) {
		return `${diffHours}h`;
	}
	if (diffMinutes > 0) {
		return `${diffMinutes}m`;
	}
	return "Now";
}

function getDueStatusColor(dueAt: string): string {
	const due = new Date(dueAt);
	const now = new Date();
	const diffMs = due.getTime() - now.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffMs < 0) {
		return "text-destructive";
	}
	if (diffDays === 0) {
		return "text-amber-500";
	}
	if (diffDays <= 3) {
		return "text-blue-500";
	}
	return "text-muted-foreground";
}

export function CardRow({
	card,
	packType,
	onEdit,
	onDelete,
	dueAt,
}: CardRowProps) {
	const questionText = getCardQuestionText(card) || card.prompt || "card";
	const answerText = getCardAnswerText(card) || card.answer;

	return (
		<Card className="group relative transition hover:-translate-y-0.5 hover:shadow-md">
			<div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
				<Button
					size="icon-sm"
					variant="ghost"
					className="bg-background/80 hover:bg-accent"
					onClick={() => onEdit(card)}
					aria-label={`Edit ${questionText}`}
				>
					<IconPencil className="size-4" />
				</Button>
				<Button
					size="icon-sm"
					variant="ghost"
					className="bg-background/80 hover:bg-destructive/10 hover:text-destructive"
					onClick={() => onDelete(card)}
					aria-label={`Delete ${questionText}`}
				>
					<IconTrash className="size-4" />
				</Button>
			</div>
			<CardHeader className="pb-3 pr-24">
				<CardTitle className="text-base leading-tight">
					{questionText || "[Untitled question]"}
				</CardTitle>
				{packType === "pinyin-hanzi" ? (
					<CardDescription className={cn(!answerText && "italic")}>
						{answerText ? (
							<HanziAnswerPreview answerText={answerText} />
						) : (
							"No answer provided"
						)}
					</CardDescription>
				) : (
					<CardDescription
						className={cn("line-clamp-2", !answerText && "italic")}
					>
						{answerText || "No answer provided"}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="flex items-center gap-4 text-xs text-muted-foreground">
				<div className="flex items-center gap-1">
					<IconCalendar className="size-3.5" />
					<span>Created {new Date(card.created_at).toLocaleDateString()}</span>
				</div>
				{dueAt && (
					<div
						className={cn(
							"flex items-center gap-1 font-medium",
							getDueStatusColor(dueAt),
						)}
					>
						<IconClock className="size-3.5" />
						<span>Due {formatDueTime(dueAt)}</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function HanziAnswerPreview({ answerText }: { answerText: string }) {
	const characters = Array.from(answerText).filter(
		(char) => char.trim().length > 0,
	);

	return (
		<div className="mt-1 flex flex-wrap gap-0.5">
			{characters.map((char, index) => (
				<div
					key={`${char}-${index}`}
					className="relative flex h-9 w-9 items-center justify-center rounded-sm border bg-background"
				>
					<svg
						className="pointer-events-none absolute inset-0 text-border/70"
						viewBox="0 0 100 100"
						aria-hidden="true"
					>
						<line
							x1="50"
							y1="0"
							x2="50"
							y2="100"
							stroke="currentColor"
							strokeWidth="1.5"
						/>
						<line
							x1="0"
							y1="50"
							x2="100"
							y2="50"
							stroke="currentColor"
							strokeWidth="1.5"
						/>
						<line
							x1="0"
							y1="0"
							x2="100"
							y2="100"
							stroke="currentColor"
							strokeWidth="1.25"
						/>
						<line
							x1="100"
							y1="0"
							x2="0"
							y2="100"
							stroke="currentColor"
							strokeWidth="1.25"
						/>
					</svg>
					<span
						className="relative leading-none tracking-wide text-foreground"
						style={{
							fontSize: "1.5rem",
							fontFamily:
								'"STKaiti", "KaiTi", "Kaiti SC", "Noto Serif SC", serif',
						}}
					>
						{char}
					</span>
				</div>
			))}
		</div>
	);
}
