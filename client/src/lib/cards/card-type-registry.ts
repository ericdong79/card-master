import type { Card, CardMediaAsset } from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import {
	DEFAULT_CARD_PACK_TYPE,
	resolveCardPackType,
} from "@/lib/api/entities/card-pack";
import i18n from "@/i18n";

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

function buildCardTypeRegistry(): Record<CardPackType, CardTypeConfig> {
	return {
		basic: {
			label: i18n.t("cardType.basic"),
			questionLabel: i18n.t("cardType.fields.question"),
			answerLabel: i18n.t("cardType.fields.answer"),
			questionPlaceholder: i18n.t("cardType.placeholders.defaultQuestion"),
			answerPlaceholder: i18n.t("cardType.placeholders.defaultAnswer"),
			supportsQuestionImage: false,
			supportsQuestionAudio: false,
			validate: (values) =>
				values.questionText.trim()
					? null
					: i18n.t("cardType.validation.questionRequired"),
		},
		"image-recall": {
			label: i18n.t("cardType.imageRecall"),
			questionLabel: i18n.t("cardType.fields.question"),
			answerLabel: i18n.t("cardType.fields.answer"),
			questionPlaceholder: i18n.t("cardType.placeholders.imageRecallQuestion"),
			answerPlaceholder: i18n.t("cardType.placeholders.imageRecallAnswer"),
			supportsQuestionImage: true,
			supportsQuestionAudio: false,
			validate: (values) => {
				if (!values.questionText.trim() && !values.questionImage) {
					return i18n.t("cardType.validation.questionOrImageRequired");
				}
				if (!values.answerText.trim()) {
					return i18n.t("cardType.validation.answerRequired");
				}
				return null;
			},
		},
		"pinyin-hanzi": {
			label: i18n.t("cardType.pinyinHanzi"),
			questionLabel: i18n.t("cardType.fields.pinyin"),
			answerLabel: i18n.t("cardType.fields.hanzi"),
			questionPlaceholder: i18n.t("cardType.placeholders.pinyinQuestion"),
			answerPlaceholder: i18n.t("cardType.placeholders.pinyinAnswer"),
			supportsQuestionImage: false,
			supportsQuestionAudio: true,
			validate: (values) => {
				if (!values.questionText.trim()) {
					return i18n.t("cardType.validation.pinyinRequired");
				}
				if (!values.answerText.trim()) {
					return i18n.t("cardType.validation.hanziRequired");
				}
				return null;
			},
		},
	};
}

export function getCardTypeConfig(packType: CardPackType | undefined): CardTypeConfig {
	const registry = buildCardTypeRegistry();
	return registry[resolveCardPackType(packType)] ??
		registry[DEFAULT_CARD_PACK_TYPE];
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
