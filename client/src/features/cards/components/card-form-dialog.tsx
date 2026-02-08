/** biome-ignore-all lint/correctness/useUniqueElementIds: <explanation> */
import { type ChangeEvent, useEffect, useState } from "react";
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
	type CardEditorValues,
	createEmptyCardEditorValues,
	getCardEditorValues,
	getCardTypeConfig,
} from "@/lib/cards/card-type-registry";
import { resolvePinyin } from "@/lib/pinyin/provider";

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
	const [values, setValues] = useState<CardEditorValues>(
		createEmptyCardEditorValues(),
	);
	const [pending, setPending] = useState(false);
	const [converting, setConverting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const normalizedPackType = resolveCardPackType(packType);
	const config = getCardTypeConfig(normalizedPackType);

	useEffect(() => {
		if (open) {
			setValues(getCardEditorValues(card));
			setError(null);
		}
	}, [open, card]);

	const handleSubmit = async () => {
		const validationError = config.validate(values);
		if (validationError) {
			setError(validationError);
			return;
		}

		setPending(true);
		try {
			await onSubmit(buildCardPayload(packType, values));
		} finally {
			setPending(false);
		}
	};

	const setQuestionText = (questionText: string) => {
		setValues((prev) => ({ ...prev, questionText }));
		setError(null);
	};

	const setAnswerText = (answerText: string) => {
		setValues((prev) => ({ ...prev, answerText }));
		setError(null);
	};

	const handleQuestionImageUpload = async (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			const asset = await readFileAsAsset(file, "image", t("cards.form.readFileError"));
			setValues((prev) => ({ ...prev, questionImage: asset }));
			setError(null);
		} catch (uploadError) {
			setError(
				uploadError instanceof Error
					? uploadError.message
					: t("cards.form.loadImageError"),
			);
		}
	};

	const handleQuestionAudioUpload = async (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			const asset = await readFileAsAsset(file, "audio", t("cards.form.readFileError"));
			setValues((prev) => ({ ...prev, questionAudio: asset }));
			setError(null);
		} catch (uploadError) {
			setError(
				uploadError instanceof Error
					? uploadError.message
					: t("cards.form.loadAudioError"),
			);
		}
	};

	const handleConvertToPinyin = async () => {
		const hanzi = values.answerText.trim();
		if (!hanzi) {
			setError(t("cards.form.enterHanziFirst"));
			return;
		}

		setConverting(true);
		try {
			const pinyin = await resolvePinyin(hanzi);
			setValues((prev) => ({ ...prev, questionText: pinyin }));
			setError(null);
		} catch (conversionError) {
			setError(
				conversionError instanceof Error
					? conversionError.message
					: t("cards.form.convertError"),
			);
		} finally {
			setConverting(false);
		}
	};

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
					<div className="space-y-2">
						<Label htmlFor="card-question">{config.questionLabel}</Label>
						<div className="relative">
							<Textarea
								id="card-question"
								value={values.questionText}
								onChange={(event) => setQuestionText(event.target.value)}
								placeholder={config.questionPlaceholder}
								className={
									normalizedPackType === "pinyin-hanzi" ? "pb-10" : undefined
								}
							/>
							{normalizedPackType === "pinyin-hanzi" ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleConvertToPinyin}
									disabled={pending || converting}
									className="absolute bottom-2 left-2"
								>
									{converting
										? t("cards.form.converting")
										: t("cards.form.convertFromHanzi")}
								</Button>
							) : null}
						</div>
					</div>
					{config.supportsQuestionImage ? (
						<div className="space-y-2">
							<Label htmlFor="card-question-image">
								{t("cards.form.questionImage")}
							</Label>
							<Input
								id="card-question-image"
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
											setValues((prev) => ({ ...prev, questionImage: null }))
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
							<Label htmlFor="card-question-audio">
								{t("cards.form.questionAudioOptional")}
							</Label>
							<Input
								id="card-question-audio"
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
											setValues((prev) => ({ ...prev, questionAudio: null }))
										}
									>
										{t("cards.form.removeAudio")}
									</Button>
								</div>
							) : null}
						</div>
					) : null}
					<div className="space-y-2">
						<Label htmlFor="card-answer">{config.answerLabel}</Label>
						<Textarea
							id="card-answer"
							value={values.answerText}
							onChange={(event) => setAnswerText(event.target.value)}
							placeholder={config.answerPlaceholder}
						/>
					</div>
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
