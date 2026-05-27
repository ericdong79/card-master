import type { CardMediaAsset } from "@/lib/api/entities/card";
import {
	type CardEditorValues,
	createEmptyCardEditorValues,
} from "@/lib/cards/card-type-registry";

export type CardFormState = {
	values: CardEditorValues;
	pending: boolean;
	converting: boolean;
	error: string | null;
	/**
	 * For pinyin-hanzi packs we auto-derive the question (pinyin) from the
	 * answer (hanzi) until the user types in the question field themselves.
	 * Once this flag is true the auto-fill effect stops firing.
	 */
	questionManuallyEdited: boolean;
};

export type CardFormAction =
	| { type: "reset"; values: CardEditorValues }
	| {
			type: "setQuestion";
			text: string;
			source: "manual" | "auto";
			isPinyinHanziPack: boolean;
	  }
	| { type: "setAnswer"; text: string }
	| { type: "setQuestionImage"; image: CardMediaAsset | null }
	| { type: "setQuestionAudio"; audio: CardMediaAsset | null }
	| { type: "setError"; error: string | null }
	| { type: "submitStart" }
	| { type: "submitFinish"; error?: string }
	| { type: "convertStart" }
	| { type: "convertFinish"; pinyin?: string; error?: string }
	| { type: "autoFillQuestion"; hanzi: string; pinyin: string };

export function createInitialCardFormState(): CardFormState {
	return {
		values: createEmptyCardEditorValues(),
		pending: false,
		converting: false,
		error: null,
		questionManuallyEdited: false,
	};
}

function assertNever(value: never): never {
	throw new Error(`Unhandled CardFormAction: ${JSON.stringify(value)}`);
}

export function cardFormReducer(
	state: CardFormState,
	action: CardFormAction,
): CardFormState {
	switch (action.type) {
		case "reset":
			return {
				values: action.values,
				pending: false,
				converting: false,
				error: null,
				questionManuallyEdited: false,
			};

		case "setQuestion": {
			const nextManuallyEdited =
				action.source === "manual" && action.isPinyinHanziPack
					? true
					: state.questionManuallyEdited;
			return {
				...state,
				values: { ...state.values, questionText: action.text },
				error: null,
				questionManuallyEdited: nextManuallyEdited,
			};
		}

		case "setAnswer":
			return {
				...state,
				values: { ...state.values, answerText: action.text },
				error: null,
			};

		case "setQuestionImage":
			return {
				...state,
				values: { ...state.values, questionImage: action.image },
				error: null,
			};

		case "setQuestionAudio":
			return {
				...state,
				values: { ...state.values, questionAudio: action.audio },
				error: null,
			};

		case "setError":
			return { ...state, error: action.error };

		case "submitStart":
			return { ...state, pending: true, error: null };

		case "submitFinish":
			return {
				...state,
				pending: false,
				error: action.error ?? null,
			};

		case "convertStart":
			return { ...state, converting: true, error: null };

		case "convertFinish": {
			if (action.error !== undefined) {
				return { ...state, converting: false, error: action.error };
			}
			if (action.pinyin === undefined) {
				return { ...state, converting: false };
			}
			// Explicit convert button counts as auto-fill (user clicked, not typed).
			return {
				...state,
				converting: false,
				error: null,
				values: { ...state.values, questionText: action.pinyin },
			};
		}

		case "autoFillQuestion": {
			// Guard: only fill if the answer still matches and question is still
			// empty and the user hasn't started editing the question.
			if (state.questionManuallyEdited) return state;
			if (state.values.questionText.trim() !== "") return state;
			if (state.values.answerText.trim() !== action.hanzi) return state;
			return {
				...state,
				values: { ...state.values, questionText: action.pinyin },
			};
		}

		default:
			return assertNever(action);
	}
}
