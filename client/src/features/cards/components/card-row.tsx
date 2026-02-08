import {
	IconCalendar,
	IconClock,
	IconPencil,
	IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
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
import { CardPreviewContent } from "./card-preview-content";

type CardRowProps = {
	card: CardEntity;
	packType?: CardPackType;
	onEdit: (card: CardEntity) => void;
	onDelete: (card: CardEntity) => void;
	dueAt?: string;
};

function formatDueTime(dueAt: string, t: (key: string, options?: Record<string, unknown>) => string): string {
	const due = new Date(dueAt);
	const now = new Date();
	const diffMs = due.getTime() - now.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffMinutes = Math.floor(diffMs / (1000 * 60));

	if (diffMs < 0) {
		return t("cards.overdue");
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
	return t("cards.now");
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
	const { t, i18n } = useTranslation();
	const questionText = getCardQuestionText(card) || card.prompt || t("cards.fallbackCard");
	const answerText = getCardAnswerText(card) || card.answer;
	const shouldShowQuestionTitle = packType !== "pinyin-hanzi";

	return (
		<Card className="group relative transition hover:-translate-y-0.5 hover:shadow-md">
			<div className="card-row-actions absolute right-3 top-3 flex items-center gap-2 transition-opacity">
				<Button
					size="icon-sm"
					variant="ghost"
					className="bg-background/80 hover:bg-accent"
					onClick={() => onEdit(card)}
					aria-label={t("cards.actions.editCard", { question: questionText })}
				>
					<IconPencil className="size-4" />
				</Button>
				<Button
					size="icon-sm"
					variant="ghost"
					className="bg-background/80 hover:bg-destructive/10 hover:text-destructive"
					onClick={() => onDelete(card)}
					aria-label={t("cards.actions.deleteCard", { question: questionText })}
				>
					<IconTrash className="size-4" />
				</Button>
			</div>
			<CardHeader className="pb-3 pr-24">
				{shouldShowQuestionTitle ? (
					<CardTitle className="text-base leading-tight">
						{questionText || t("cards.untitledQuestion")}
					</CardTitle>
				) : null}
				<CardPreviewContent
					card={card}
					packType={packType}
					questionText={questionText}
					answerText={answerText}
					noAnswerText={t("cards.noAnswer")}
				/>
			</CardHeader>
			<CardContent className="flex items-center gap-4 text-xs text-muted-foreground">
				<div className="flex items-center gap-1">
					<IconCalendar className="size-3.5" />
					<span>
						{t("cards.createdAt", {
							date: new Date(card.created_at).toLocaleDateString(i18n.language),
						})}
					</span>
				</div>
				{dueAt && (
					<div
						className={cn(
							"flex items-center gap-1 font-medium",
							getDueStatusColor(dueAt),
						)}
					>
						<IconClock className="size-3.5" />
						<span>{t("cards.due", { time: formatDueTime(dueAt, t) })}</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
