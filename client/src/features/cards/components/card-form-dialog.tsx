import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useId,
	useReducer,
} from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type {
	Card as CardEntity,
	CardMediaAsset,
} from "@/lib/api/entities/card";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import { resolveCardPackType } from "@/lib/api/entities/card-pack";
import {
	buildCardPayload,
	getCardEditorValues,
	getCardTypeConfig,
} from "@/lib/cards/card-type-registry";
import { resolvePinyin } from "@/lib/pinyin/provider";

import {
	cardFormReducer,
	createInitialCardFormState,
} from "./card-form-state";

type CardSubmitPayload = {
	prompt: string;
	answer: string;
	question_content: CardEntity["question_content"];
	answer_content: CardEntity["answer_content"];
};

type CardFormDialogProps = {
	mode: "create" | "edit";
	open: boolean;
	onOpenChange: (open: boolean) => void;
	packType?: CardPackType;
	onSubmit: (values: CardSubmitPayload) => Promise<void>;
	card?: CardEntity | null;
};

function readFileAsAsset(
	file: File,
	kind: CardMediaAsset["kind"],
	readErrorMessage: string,
): Promise<CardMediaAsset> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result;
			if (typeof dataUrl !== "string") {
				reject(new Error(readErrorMessage));
				return;
			}
			resolve({ kind, mime_type: file.type, data_url: dataUrl });
		};
		reader.onerror = () => reject(reader.error ?? new Error(readErrorMessage));
		reader.readAsDataURL(file);
	});
}

export function CardFormDialog({
	mode,
	open,
	onOpenChange,
	onSubmit,
	card,
	packType,
}: CardFormDialogProps) {
	const { t } = useTranslation();
	const normalizedPackType = resolveCardPackType(packType);
	const isPinyinHanziPack = normalizedPackType === "pinyin-hanzi";
	const config = getCardTypeConfig(normalizedPackType);

	const [state, dispatch] = useReducer(
		cardFormReducer,
		undefined,
		createInitialCardFormState,
	);
	const { values, pending, converting, error, questionManuallyEdited } = state;

	// Generate unique ids per dialog instance so multiple dialogs can coexist
	// (e.g. create + edit dialogs mounted on the same page).
	const reactId = useId();
	const ids = {
		question: `card-question-${reactId}`,
		answer: `card-answer-${reactId}`,
		questionImage: `card-question-image-${reactId}`,
		questionAudio: `card-question-audio-${reactId}`,
	};

	useEffect(() => {
		if (open) {
			dispatch({ type: "reset", values: getCardEditorValues(card) });
		}
	}, [open, card]);

	const handleSubmit = async () => {
		const validationError = config.validate(values);
		if (validationError) {
			dispatch({ type: "setError", error: validationError });
			return;
		}

		dispatch({ type: "submitStart" });
		try {
			await onSubmit(buildCardPayload(packType, values));
			dispatch({ type: "submitFinish" });
		} catch (submitError) {
			dispatch({
				type: "submitFinish",
				error:
					submitError instanceof Error
						? submitError.message
						: mode === "create"
							? t("errors.createCard")
							: t("errors.updateCard"),
			});
		}
	};

	const handleQuestionImageUpload = async (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			const asset = await readFileAsAsset(
				file,
				"image",
				t("cards.form.readFileError"),
			);
			dispatch({ type: "setQuestionImage", image: asset });
		} catch (uploadError) {
			dispatch({
				type: "setError",
				error:
					uploadError instanceof Error
						? uploadError.message
						: t("cards.form.loadImageError"),
			});
		}
	};

	const handleQuestionAudioUpload = async (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			const asset = await readFileAsAsset(
				file,
				"audio",
				t("cards.form.readFileError"),
			);
			dispatch({ type: "setQuestionAudio", audio: asset });
		} catch (uploadError) {
			dispatch({
				type: "setError",
				error:
					uploadError instanceof Error
						? uploadError.message
						: t("cards.form.loadAudioError"),
			});
		}
	};

	const handleConvertToPinyin = useCallback(async () => {
		const hanzi = values.answerText.trim();
		if (!hanzi) {
			dispatch({ type: "setError", error: t("cards.form.enterHanziFirst") });
			return;
		}

		dispatch({ type: "convertStart" });
		try {
			const pinyin = await resolvePinyin(hanzi);
			dispatch({ type: "convertFinish", pinyin });
		} catch (conversionError) {
			dispatch({
				type: "convertFinish",
				error:
					conversionError instanceof Error
						? conversionError.message
						: t("cards.form.convertError"),
			});
		}
	}, [t, values.answerText]);

	// Auto-derive pinyin from hanzi while the user hasn't typed the question
	// themselves yet (pinyin-hanzi packs only). Once they edit the question
	// field manually, `questionManuallyEdited` flips and this stops firing.
	useEffect(() => {
		if (!isPinyinHanziPack) return;
		if (questionManuallyEdited) return;
		if (values.questionText.trim()) return;

		const hanzi = values.answerText.trim();
		if (!hanzi) return;

		let cancelled = false;
		const timer = setTimeout(async () => {
			try {
				const pinyin = await resolvePinyin(hanzi);
				if (cancelled) return;
				dispatch({ type: "autoFillQuestion", hanzi, pinyin });
			} catch {
				// Ignore auto-conversion errors while the user is typing.
			}
		}, 350);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [
		isPinyinHanziPack,
		questionManuallyEdited,
		values.answerText,
		values.questionText,
	]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="space-y-4">
				<DialogHeader>
					<DialogTitle>
						{mode === "create"
							? t("cards.form.createTitle")
							: t("cards.form.editTitle")}
					</DialogTitle>
					<DialogDescription>
						{mode === "create"
							? t("cards.form.createDescription")
							: t("cards.form.editDescription")}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					{isPinyinHanziPack ? (
						<>
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<Label htmlFor={ids.answer}>{config.answerLabel}</Label>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleConvertToPinyin}
										disabled={pending || converting || !values.answerText.trim()}
									>
										{converting
											? t("cards.form.converting")
											: t("cards.form.convertFromHanzi")}
									</Button>
								</div>
								<Textarea
									id={ids.answer}
									value={values.answerText}
									onChange={(event) =>
										dispatch({ type: "setAnswer", text: event.target.value })
									}
									placeholder={config.answerPlaceholder}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={ids.question}>{config.questionLabel}</Label>
								<Textarea
									id={ids.question}
									value={values.questionText}
									onChange={(event) =>
										dispatch({
											type: "setQuestion",
											text: event.target.value,
											source: "manual",
											isPinyinHanziPack,
										})
									}
									placeholder={config.questionPlaceholder}
								/>
							</div>
						</>
					) : (
						<div className="space-y-2">
							<Label htmlFor={ids.question}>{config.questionLabel}</Label>
							<Textarea
								id={ids.question}
								value={values.questionText}
								onChange={(event) =>
									dispatch({
										type: "setQuestion",
										text: event.target.value,
										source: "manual",
										isPinyinHanziPack,
									})
								}
								placeholder={config.questionPlaceholder}
							/>
						</div>
					)}
					{config.supportsQuestionImage ? (
						<div className="space-y-2">
							<Label htmlFor={ids.questionImage}>
								{t("cards.form.questionImage")}
							</Label>
							<Input
								id={ids.questionImage}
								type="file"
								accept="image/*"
								onChange={handleQuestionImageUpload}
							/>
							{values.questionImage ? (
								<div className="space-y-2">
									<img
										src={values.questionImage.data_url}
										alt={t("cards.form.questionPreview")}
										className="max-h-48 rounded-md border object-contain"
									/>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											dispatch({ type: "setQuestionImage", image: null })
										}
									>
										{t("cards.form.removeImage")}
									</Button>
								</div>
							) : null}
						</div>
					) : null}
					{config.supportsQuestionAudio ? (
						<div className="space-y-2">
							<Label htmlFor={ids.questionAudio}>
								{t("cards.form.questionAudioOptional")}
							</Label>
							<Input
								id={ids.questionAudio}
								type="file"
								accept="audio/*"
								onChange={handleQuestionAudioUpload}
							/>
							{values.questionAudio ? (
								<div className="space-y-2">
									<audio controls src={values.questionAudio.data_url} />
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											dispatch({ type: "setQuestionAudio", audio: null })
										}
									>
										{t("cards.form.removeAudio")}
									</Button>
								</div>
							) : null}
						</div>
					) : null}
					{isPinyinHanziPack ? null : (
						<div className="space-y-2">
							<Label htmlFor={ids.answer}>{config.answerLabel}</Label>
							<Textarea
								id={ids.answer}
								value={values.answerText}
								onChange={(event) =>
									dispatch({ type: "setAnswer", text: event.target.value })
								}
								placeholder={config.answerPlaceholder}
							/>
						</div>
					)}
					{error ? (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					) : null}
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={pending}>
						{pending ? (
							<>
								<Spinner size="sm" className="text-primary-foreground" />
								{mode === "create" ? t("common.creating") : t("common.saving")}
							</>
						) : mode === "create" ? (
							t("common.create")
						) : (
							t("common.save")
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
