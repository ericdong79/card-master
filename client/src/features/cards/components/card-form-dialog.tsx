/** biome-ignore-all lint/correctness/useUniqueElementIds: <explanation> */
import { type ChangeEvent, useEffect, useState } from "react";

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
): Promise<CardMediaAsset> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result;
			if (typeof dataUrl !== "string") {
				reject(new Error("Failed to read file."));
				return;
			}
			resolve({ kind, mime_type: file.type, data_url: dataUrl });
		};
		reader.onerror = () =>
			reject(reader.error ?? new Error("Failed to read file."));
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
			const asset = await readFileAsAsset(file, "image");
			setValues((prev) => ({ ...prev, questionImage: asset }));
			setError(null);
		} catch (uploadError) {
			setError(
				uploadError instanceof Error
					? uploadError.message
					: "Failed to load image.",
			);
		}
	};

	const handleQuestionAudioUpload = async (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			const asset = await readFileAsAsset(file, "audio");
			setValues((prev) => ({ ...prev, questionAudio: asset }));
			setError(null);
		} catch (uploadError) {
			setError(
				uploadError instanceof Error
					? uploadError.message
					: "Failed to load audio.",
			);
		}
	};

	const handleConvertToPinyin = async () => {
		const hanzi = values.answerText.trim();
		if (!hanzi) {
			setError("Enter Hanzi in the answer field first.");
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
					: "Failed to convert Hanzi to pinyin.",
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
						{mode === "create" ? "Create card" : "Edit card"}
					</DialogTitle>
					<DialogDescription>
						{mode === "create"
							? "Add a new prompt and answer."
							: "Update this card."}
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
									{converting ? "Converting..." : "Convert from Hanzi"}
								</Button>
							) : null}
						</div>
					</div>
					{config.supportsQuestionImage ? (
						<div className="space-y-2">
							<Label htmlFor="card-question-image">Question image</Label>
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
										alt="Question preview"
										className="max-h-48 rounded-md border object-contain"
									/>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											setValues((prev) => ({ ...prev, questionImage: null }))
										}
									>
										Remove image
									</Button>
								</div>
							) : null}
						</div>
					) : null}
					{config.supportsQuestionAudio ? (
						<div className="space-y-2">
							<Label htmlFor="card-question-audio">
								Question audio (optional)
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
										Remove audio
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
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={pending}>
						{pending ? (
							<>
								<Spinner size="sm" className="text-primary-foreground" />
								{mode === "create" ? "Creating..." : "Saving..."}
							</>
						) : mode === "create" ? (
							"Create"
						) : (
							"Save"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
