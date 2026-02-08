import { useTranslation } from "react-i18next";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import { getCardAnswerText, getCardQuestionText } from "@/lib/cards/card-type-registry";
import { HanziPracticeGrid } from "@/features/cards/previews/pinyin-hanzi/hanzi-practice-grid";

type PinyinHanziQuestionContentProps = {
	card: CardEntity;
};

type PinyinHanziAnswerContentProps = {
	card: CardEntity;
};

export function PinyinHanziQuestionContent({
	card,
}: PinyinHanziQuestionContentProps) {
	const { t } = useTranslation();
	const questionText = getCardQuestionText(card);

	return (
		<div className="space-y-3">
			{questionText ? (
				<p className="text-center text-4xl font-semibold leading-relaxed tracking-tight">
					{questionText}
				</p>
			) : null}

			{card.question_content?.audio?.data_url ? (
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">{t("review.pronunciation")}</p>
					<audio controls src={card.question_content.audio.data_url} />
				</div>
			) : null}
		</div>
	);
}

export function PinyinHanziAnswerContent({
	card,
}: PinyinHanziAnswerContentProps) {
	const answerText = getCardAnswerText(card);
	const characters = Array.from(answerText).filter((char) => char.trim().length > 0);

	if (!characters.length) {
		return <p className="text-base leading-relaxed">{answerText}</p>;
	}

	return <HanziPracticeGrid answerText={answerText} size="large" />;
}
