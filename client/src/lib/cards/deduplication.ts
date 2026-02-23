import type { Card } from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import { resolveCardPackType } from "@/lib/api/entities/card-pack";

export type DuplicateReason =
	| "same-question-and-answer"
	| "same-question-different-answer"
	| "same-answer-different-question";

export type CardTextPair = {
	questionText: string;
	answerText: string;
};

function normalizeText(text: string): string {
	return text.trim();
}

function getComparableQuestionFromCard(card: Card): string {
	const text = card.question_content?.text;
	if (typeof text === "string") return normalizeText(text);
	return card.prompt === "[Image question]" ? "" : normalizeText(card.prompt);
}

function getComparableAnswerFromCard(card: Card): string {
	const text = card.answer_content?.text;
	if (typeof text === "string") return normalizeText(text);
	return normalizeText(card.answer);
}

function isHardDuplicateReason(
	reason: DuplicateReason,
	packType: CardPackType | undefined,
): boolean {
	if (reason === "same-question-and-answer") return true;
	if (reason === "same-question-different-answer") return true;
	return resolveCardPackType(packType) === "pinyin-hanzi";
}

export function findDuplicateReason(
	existingCards: Card[],
	candidate: CardTextPair,
	options?: { excludeCardId?: string },
): DuplicateReason | null {
	const questionText = normalizeText(candidate.questionText);
	const answerText = normalizeText(candidate.answerText);

	for (const card of existingCards) {
		if (options?.excludeCardId && card.id === options.excludeCardId) continue;
		const existingQuestion = getComparableQuestionFromCard(card);
		const existingAnswer = getComparableAnswerFromCard(card);

		if (existingQuestion === questionText && existingAnswer === answerText) {
			return "same-question-and-answer";
		}
		if (existingQuestion === questionText && existingAnswer !== answerText) {
			return "same-question-different-answer";
		}
		if (existingQuestion !== questionText && existingAnswer === answerText) {
			return "same-answer-different-question";
		}
	}
	return null;
}

export function splitBulkByDuplicateRules(
	existingCards: Card[],
	candidates: CardTextPair[],
	packType: CardPackType | undefined,
): { accepted: CardTextPair[]; skippedCount: number } {
	const existingPairs: CardTextPair[] = existingCards.map((card) => ({
		questionText: getComparableQuestionFromCard(card),
		answerText: getComparableAnswerFromCard(card),
	}));
	const accepted: CardTextPair[] = [];
	let skippedCount = 0;

	for (const candidate of candidates) {
		const allPairs = [...existingPairs, ...accepted];
		const reason = findDuplicateReasonInPairs(allPairs, candidate);
		if (reason && isHardDuplicateReason(reason, packType)) {
			skippedCount += 1;
			continue;
		}
		accepted.push(candidate);
	}

	return { accepted, skippedCount };
}

export function isHardDuplicate(
	reason: DuplicateReason | null,
	packType: CardPackType | undefined,
): boolean {
	if (!reason) return false;
	return isHardDuplicateReason(reason, packType);
}

function findDuplicateReasonInPairs(
	existingPairs: CardTextPair[],
	candidate: CardTextPair,
): DuplicateReason | null {
	const questionText = normalizeText(candidate.questionText);
	const answerText = normalizeText(candidate.answerText);

	for (const pair of existingPairs) {
		const existingQuestion = normalizeText(pair.questionText);
		const existingAnswer = normalizeText(pair.answerText);

		if (existingQuestion === questionText && existingAnswer === answerText) {
			return "same-question-and-answer";
		}
		if (existingQuestion === questionText && existingAnswer !== answerText) {
			return "same-question-different-answer";
		}
		if (existingQuestion !== questionText && existingAnswer === answerText) {
			return "same-answer-different-question";
		}
	}
	return null;
}
