import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import { cn } from "@/lib/utils";
import { CardDescription } from "@/components/ui/card";
import { getCardPreviewRenderer } from "../previews/card-preview-registry";

export type CardPreviewContentProps = {
	card: CardEntity;
	packType?: CardPackType;
	questionText: string;
	answerText: string;
	noAnswerText: string;
};

function DefaultCardPreviewContent({
	answerText,
	noAnswerText,
}: CardPreviewContentProps) {
	return (
		<CardDescription className={cn("line-clamp-2", !answerText && "italic")}>
			{answerText || noAnswerText}
		</CardDescription>
	);
}

export function CardPreviewContent(props: CardPreviewContentProps) {
	const renderer = getCardPreviewRenderer(props.packType) ?? DefaultCardPreviewContent;
	return renderer(props);
}
