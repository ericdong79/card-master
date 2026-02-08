import type { Card, CardMediaAsset } from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import {
	DEFAULT_CARD_PACK_TYPE,
	resolveCardPackType,
} from "@/lib/api/entities/card-pack";

export type CardEditorValues = {
	questionText: string;
	answerText: string;
	questionImage: CardMediaAsset | null;
	questionAudio: CardMediaAsset | null;
};

export type CardTypeConfig = {
	label: string;
	questionLabel: string;
	answerLabel: string;
	questionPlaceholder: string;
	answerPlaceholder: string;
	supportsQuestionImage: boolean;
	supportsQuestionAudio: boolean;
	validate: (values: CardEditorValues) => string | null;
};

const DEFAULT_QUESTION_PLACEHOLDER = "E.g. What is spaced repetition?";
const DEFAULT_ANSWER_PLACEHOLDER = "Your answer...";

export const CARD_TYPE_REGISTRY: Record<CardPackType, CardTypeConfig> = {
	basic: {
		label: "Basic",
		questionLabel: "Question",
		answerLabel: "Answer",
		questionPlaceholder: DEFAULT_QUESTION_PLACEHOLDER,
		answerPlaceholder: DEFAULT_ANSWER_PLACEHOLDER,
		supportsQuestionImage: false,
		supportsQuestionAudio: false,
		validate: (values) =>
			values.questionText.trim() ? null : "Question is required.",
	},
	"image-recall": {
		label: "Image Recall",
		questionLabel: "Question",
		answerLabel: "Answer",
		questionPlaceholder: "Optional text hint...",
		answerPlaceholder: "E.g. Japan",
		supportsQuestionImage: true,
		supportsQuestionAudio: false,
		validate: (values) => {
			if (!values.questionText.trim() && !values.questionImage) {
				return "Add question text or upload an image.";
			}
			if (!values.answerText.trim()) {
				return "Answer is required.";
			}
			return null;
		},
	},
	"pinyin-hanzi": {
		label: "Pinyin -> Hanzi",
		questionLabel: "Pinyin",
		answerLabel: "Hanzi",
		questionPlaceholder: "E.g. zhong guo",
		answerPlaceholder: "E.g. 中国",
		supportsQuestionImage: false,
		supportsQuestionAudio: true,
		validate: (values) => {
			if (!values.questionText.trim()) return "Pinyin is required.";
			if (!values.answerText.trim()) return "Hanzi is required.";
			return null;
		},
	},
};

export function getCardTypeConfig(packType: CardPackType | undefined): CardTypeConfig {
	return CARD_TYPE_REGISTRY[resolveCardPackType(packType)] ??
		CARD_TYPE_REGISTRY[DEFAULT_CARD_PACK_TYPE];
}

export function getCardPackTypeLabel(packType: CardPackType | undefined): string {
	return getCardTypeConfig(packType).label;
}

export function createEmptyCardEditorValues(): CardEditorValues {
	return {
		questionText: "",
		answerText: "",
		questionImage: null,
		questionAudio: null,
	};
}

function isCardMediaAsset(value: unknown): value is CardMediaAsset {
	if (!value || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;
	return (
		(record.kind === "image" || record.kind === "audio") &&
		typeof record.mime_type === "string" &&
		typeof record.data_url === "string"
	);
}

export function getCardEditorValues(card?: Card | null): CardEditorValues {
	if (!card) return createEmptyCardEditorValues();

	const questionText = card.question_content?.text ?? card.prompt;
	const answerText = card.answer_content?.text ?? card.answer;
	const questionImage = isCardMediaAsset(card.question_content?.image)
		? card.question_content.image
		: null;
	const questionAudio = isCardMediaAsset(card.question_content?.audio)
		? card.question_content.audio
		: null;

	return {
		questionText,
		answerText,
		questionImage,
		questionAudio,
	};
}

export function buildCardPayload(packType: CardPackType | undefined, values: CardEditorValues) {
	const normalizedType = resolveCardPackType(packType);
	const trimmedQuestion = values.questionText.trim();
	const trimmedAnswer = values.answerText.trim();

	const question_content: Card["question_content"] = {
		text: trimmedQuestion || undefined,
		image:
			normalizedType === "image-recall" ? values.questionImage ?? undefined : undefined,
		audio:
			normalizedType === "pinyin-hanzi" ? values.questionAudio ?? undefined : undefined,
	};

	const answer_content: Card["answer_content"] = {
		text: trimmedAnswer || undefined,
	};

	const hasQuestionContent =
		Boolean(question_content?.text) ||
		Boolean(question_content?.image) ||
		Boolean(question_content?.audio);
	const hasAnswerContent = Boolean(answer_content?.text);

	return {
		prompt: trimmedQuestion || (values.questionImage ? "[Image question]" : ""),
		answer: trimmedAnswer,
		question_content: hasQuestionContent ? question_content : null,
		answer_content: hasAnswerContent ? answer_content : null,
	};
}

export function getCardQuestionText(card: Card): string {
	return card.question_content?.text ?? card.prompt;
}

export function getCardAnswerText(card: Card): string {
	return card.answer_content?.text ?? card.answer;
}
