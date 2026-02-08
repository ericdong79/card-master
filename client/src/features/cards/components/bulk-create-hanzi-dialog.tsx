import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import { buildCardPayload } from "@/lib/cards/card-type-registry";
import { resolvePinyin } from "@/lib/pinyin/provider";

type CardSubmitPayload = {
	prompt: string;
	answer: string;
	question_content: CardEntity["question_content"];
	answer_content: CardEntity["answer_content"];
};

type BulkCreateHanziDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: CardSubmitPayload[]) => Promise<void>;
};

export function BulkCreateHanziDialog({
	open,
	onOpenChange,
	onSubmit,
}: BulkCreateHanziDialogProps) {
	const { t } = useTranslation();
	const [value, setValue] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setValue("");
			setError(null);
		}
	}, [open]);

	const getEntries = () =>
		value
			.split(/\s+/)
			.map((item) => item.trim())
			.filter(Boolean);

	const handleSubmit = async () => {
		const entries = getEntries();
		if (entries.length === 0) {
			setError(t("cards.bulkHanzi.emptyError"));
			return;
		}

		setPending(true);
		setError(null);
		try {
			const questions = await Promise.all(
				entries.map((hanzi) => resolvePinyin(hanzi)),
			);
			const payloads = entries.map((hanzi, index) =>
				buildCardPayload("pinyin-hanzi", {
					questionText: questions[index],
					answerText: hanzi,
					questionImage: null,
					questionAudio: null,
				}),
			);
			await onSubmit(payloads);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: t("cards.bulkHanzi.createError"),
			);
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="space-y-4">
				<DialogHeader>
					<DialogTitle>{t("cards.bulkHanzi.title")}</DialogTitle>
					<DialogDescription>
						{t("cards.bulkHanzi.description")}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="bulk-hanzi-input">
						{t("cards.bulkHanzi.label")}
					</Label>
					{/** biome-ignore lint/correctness/useUniqueElementIds: <explanation> */}
					<Textarea
						id="bulk-hanzi-input"
						value={value}
						onChange={(event) => {
							setValue(event.target.value);
							setError(null);
						}}
						placeholder={t("cards.bulkHanzi.placeholder")}
					/>
				</div>
				{error ? (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				) : null}
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={pending}>
						{pending ? (
							<>
								<Spinner size="sm" className="text-primary-foreground" />
								{t("common.creating")}
							</>
						) : (
							t("cards.bulkHanzi.createCards")
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
