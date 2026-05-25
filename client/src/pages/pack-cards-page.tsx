import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import {
	getMasteryPresentationEnabled,
	getMasteryThemePreference,
} from "@/features/mastery";
import { useAuth } from "@/features/auth/use-auth";
import { BulkCreateHanziDialog } from "@/features/cards/components/bulk-create-hanzi-dialog";
import { CardFormDialog } from "@/features/cards/components/card-form-dialog";
import { DeleteCardDialog } from "@/features/cards/components/delete-card-dialog";
import { PackCardsContent } from "@/features/cards/components/pack-cards-content";
import { PackCardsError } from "@/features/cards/components/pack-cards-error";
import { PackCardsHeader } from "@/features/cards/components/pack-cards-header";
import { PackCardsLoading } from "@/features/cards/components/pack-cards-loading";
import { useProfile } from "@/features/profile/profile-context";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import {
	findDuplicateReason,
	isHardDuplicate,
	splitBulkByDuplicateRules,
	type DuplicateReason,
} from "@/lib/cards/deduplication";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { Sm2State } from "@/lib/scheduling/types";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import { createCardRepository } from "@/lib/data/repositories/card-repository";
import { createCardPackRepository } from "@/lib/data/repositories/card-pack-repository";
import { createSchedulingRepository } from "@/lib/data/repositories/scheduling-repository";

type CardSubmitPayload = {
	prompt: string;
	answer: string;
	question_content: CardEntity["question_content"];
	answer_content: CardEntity["answer_content"];
};

function getDuplicateErrorMessage(
	reason: DuplicateReason,
	t: (key: string) => string,
): string {
	switch (reason) {
		case "same-question-and-answer":
			return t("cards.dedup.sameQuestionAndAnswer");
		case "same-question-different-answer":
			return t("cards.dedup.sameQuestionDifferentAnswer");
		case "same-answer-different-question":
			return t("cards.dedup.sameAnswerDifferentQuestionPinyinHanzi");
		default:
			return t("errors.createCard");
	}
}

export function PackCardsPage() {
	const { t } = useTranslation();
	const { cardPackId } = useParams<{ cardPackId: string }>();
	const cardRepository = useMemo(() => createCardRepository(), []);
	const cardPackRepository = useMemo(() => createCardPackRepository(), []);
	const schedulingRepository = useMemo(() => createSchedulingRepository(), []);
	const { accountUserId } = useAuth();
	const { currentProfile } = useProfile();
	const profileId = currentProfile?.id ?? null;
	const masteryEnabled = profileId
		? getMasteryPresentationEnabled(profileId)
		: false;
	const masteryThemeId = profileId
		? getMasteryThemePreference(profileId)
		: null;

	const [cardPack, setCardPack] = useState<CardPack | null>(null);
	const [cards, setCards] = useState<CardEntity[]>([]);
	const [schedulingStates, setSchedulingStates] = useState<
		CardSchedulingState[]
	>([]);
	const [masteryStates, setMasteryStates] = useState<CardMasteryState[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const [createOpen, setCreateOpen] = useState(false);
	const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
	const [editingCard, setEditingCard] = useState<CardEntity | null>(null);
	const [deleteCardTarget, setDeleteCardTarget] = useState<CardEntity | null>(
		null,
	);
	const [pendingAction, setPendingAction] = useState<
		"create" | "edit" | "delete" | null
	>(null);

	const cardStatusCounts = useMemo(() => {
		const now = new Date();
		const stateMap = new Map(schedulingStates.map((s) => [s.card_id, s]));
		let learning = 0;
		let review = 0;
		let due = 0;

		for (const card of cards) {
			const state = stateMap.get(card.id);
			const sm2State = (state?.state as Sm2State | null) ?? null;

			if (sm2State?.phase === "learning" || sm2State?.phase === "relearning") {
				learning += 1;
			}
			if (sm2State?.phase === "review") {
				review += 1;
			}
			if (!state || new Date(state.due_at) <= now) {
				due += 1;
			}
		}

		return {
			total: cards.length,
			learning,
			review,
			due,
		};
	}, [cards, schedulingStates]);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		setCardPack(null);
		setCards([]);
		setSchedulingStates([]);
		setMasteryStates([]);

		if (!cardPackId || !accountUserId || !profileId) {
			setLoading(false);
			return () => {
				cancelled = true;
			};
		}

		Promise.all([
			cardPackRepository.listCardPacks({ accountUserId, profileId }),
			cardRepository.loadPackCards({ accountUserId, profileId, cardPackId }),
		])
			.then(async ([packs, list]) => {
				if (cancelled) return;
				const pack = packs.find((item) => item.id === cardPackId) ?? null;
				if (!pack) {
					setError(t("errors.packNotFound"));
					setCardPack(null);
					setCards([]);
					setSchedulingStates([]);
					setMasteryStates([]);
					return;
				}
				setCardPack(pack);
				setCards(list);

				// Load scheduling states for due cards calculation
				if (list.length > 0) {
					const [states, mastery] = await Promise.all([
						schedulingRepository.listSchedulingStatesByCardIds({
							accountUserId,
							profileId,
							cardIds: list.map((c) => c.id),
						}),
						cardRepository.listMasteryStatesByCardIds({
							accountUserId,
							profileId,
							cardIds: list.map((c) => c.id),
						}),
					]);
					if (cancelled) return;
					setSchedulingStates(states);
					setMasteryStates(mastery);
				} else {
					setSchedulingStates([]);
					setMasteryStates([]);
				}
			})
			.catch((err) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : t("errors.loadCards"));
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [
		accountUserId,
		cardPackId,
		cardPackRepository,
		cardRepository,
		profileId,
		schedulingRepository,
		t,
	]);

	const dueTimesByCardId = useMemo(
		() =>
			schedulingStates.reduce<Record<string, string>>((result, state) => {
				result[state.card_id] = state.due_at;
				return result;
			}, {}),
		[schedulingStates],
	);

	const masteryByCardId = useMemo(
		() =>
			masteryStates.reduce<Record<string, CardMasteryState>>((result, state) => {
				result[state.card_id] = state;
				return result;
			}, {}),
		[masteryStates],
	);

	if (!cardPackId) {
		return <Navigate to="/" replace />;
	}
	if (!accountUserId || !profileId) {
		return null;
	}

	const handleCreate = async (values: CardSubmitPayload) => {
		if (!cardPackId || !accountUserId || !profileId) return;

		const duplicateReason = findDuplicateReason(cards, {
			questionText: values.question_content?.text ?? values.prompt,
			answerText: values.answer_content?.text ?? values.answer,
		});
		if (duplicateReason) {
			if (isHardDuplicate(duplicateReason, cardPack?.type)) {
				throw new Error(getDuplicateErrorMessage(duplicateReason, t));
			}
			const shouldContinue = window.confirm(
				t("cards.dedup.answerConflictConfirm"),
			);
			if (!shouldContinue) return;
		}

		setPendingAction("create");
		try {
			const created = await cardRepository.createCard({
				accountUserId,
				profileId,
				cardPackId,
				prompt: values.prompt,
				answer: values.answer,
				question_content: values.question_content,
				answer_content: values.answer_content,
			});
			setCards((prev) => [...prev, created]);
			setCreateOpen(false);
			setMasteryStates((prev) => prev.filter((state) => state.card_id !== created.id));
			setError(null);
			setNotice(null);
		} catch (err) {
			throw new Error(
				err instanceof Error ? err.message : t("errors.createCard"),
			);
		} finally {
			setPendingAction(null);
		}
	};

	const handleCreateBulk = async (values: CardSubmitPayload[]) => {
		if (!cardPackId || !accountUserId || !profileId || values.length === 0) return;

		const candidatePairs = values.map((value) => ({
			questionText: value.question_content?.text ?? value.prompt,
			answerText: value.answer_content?.text ?? value.answer,
		}));
		const { accepted, skippedCount } = splitBulkByDuplicateRules(
			cards,
			candidatePairs,
			cardPack?.type,
		);

		if (accepted.length === 0) {
			setNotice(
				t("cards.dedup.bulkSkippedOnly", {
					count: skippedCount,
				}),
			);
			setBulkCreateOpen(false);
			return;
		}

		setPendingAction("create");
		try {
			const createdCards = await cardRepository.bulkCreateCards({
				accountUserId,
				profileId,
				cardPackId,
				cards: accepted.map((value) => ({
					prompt: value.questionText.trim(),
					answer: value.answerText.trim(),
					question_content: { text: value.questionText.trim() },
					answer_content: { text: value.answerText.trim() },
				})),
			});
			setCards((prev) => [...prev, ...createdCards]);
			setBulkCreateOpen(false);
			setError(null);
			setNotice(
				skippedCount > 0
					? t("cards.dedup.bulkSkipped", { count: skippedCount })
					: null,
			);
		} catch (err) {
			throw new Error(
				err instanceof Error ? err.message : t("errors.createCards"),
			);
		} finally {
			setPendingAction(null);
		}
	};

	const handleEdit = async (values: CardSubmitPayload) => {
		if (!cardPackId || !accountUserId || !profileId || !editingCard) return;

		const duplicateReason = findDuplicateReason(
			cards,
			{
				questionText: values.question_content?.text ?? values.prompt,
				answerText: values.answer_content?.text ?? values.answer,
			},
			{ excludeCardId: editingCard.id },
		);
		if (duplicateReason) {
			if (isHardDuplicate(duplicateReason, cardPack?.type)) {
				throw new Error(getDuplicateErrorMessage(duplicateReason, t));
			}
			const shouldContinue = window.confirm(
				t("cards.dedup.answerConflictConfirm"),
			);
			if (!shouldContinue) return;
		}

		setPendingAction("edit");
		try {
			const updated = await cardRepository.updateCard({
				accountUserId,
				profileId,
				cardId: editingCard.id,
				updates: {
					prompt: values.prompt,
					answer: values.answer,
					question_content: values.question_content,
					answer_content: values.answer_content,
				},
			});
			setCards((prev) =>
				prev.map((card) => (card.id === editingCard.id ? updated : card)),
			);
			setEditingCard(null);
			setError(null);
			setNotice(null);
		} catch (err) {
			throw new Error(
				err instanceof Error ? err.message : t("errors.updateCard"),
			);
		} finally {
			setPendingAction(null);
		}
	};

	const handleDelete = async () => {
		if (!accountUserId || !profileId || !deleteCardTarget) return;
		setPendingAction("delete");
		try {
			await cardRepository.deleteCard({
				accountUserId,
				profileId,
				cardId: deleteCardTarget.id,
			});
			setCards((prev) =>
				prev.filter((card) => card.id !== deleteCardTarget.id),
			);
			setMasteryStates((prev) =>
				prev.filter((state) => state.card_id !== deleteCardTarget.id),
			);
			setDeleteCardTarget(null);
			setError(null);
			setNotice(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.deleteCard"));
		} finally {
			setPendingAction(null);
		}
	};

	return (
		<div className="min-h-dvh bg-muted/20">
			<PackCardsHeader
				cardPackId={cardPackId}
				packName={cardPack?.name}
				onCreateClick={() => setCreateOpen(true)}
				onBulkCreateClick={() => setBulkCreateOpen(true)}
				showBulkCreate={cardPack?.type === "pinyin-hanzi"}
				showReviewButton={cards.length > 0}
			/>

			<main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
				{notice ? (
					<p
						className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
						role="status"
					>
						{notice}
					</p>
				) : null}
				{error ? <PackCardsError message={error} /> : null}

				{loading ? (
					<PackCardsLoading />
				) : (
					<PackCardsContent
						packName={cardPack?.name}
						packType={cardPack?.type}
						totalCards={cardStatusCounts.total}
						learningCards={cardStatusCounts.learning}
						reviewCards={cardStatusCounts.review}
						dueCards={cardStatusCounts.due}
						cards={cards}
						dueTimesByCardId={dueTimesByCardId}
						masteryByCardId={masteryByCardId}
						masteryThemeId={masteryThemeId}
						showMastery={masteryEnabled}
						onCreateClick={() => setCreateOpen(true)}
						onEdit={setEditingCard}
						onDelete={setDeleteCardTarget}
					/>
				)}
			</main>

			<CardFormDialog
				mode="create"
				open={createOpen}
				onOpenChange={setCreateOpen}
				packType={cardPack?.type}
				onSubmit={handleCreate}
			/>

			<BulkCreateHanziDialog
				open={bulkCreateOpen}
				onOpenChange={setBulkCreateOpen}
				onSubmit={handleCreateBulk}
			/>

			<CardFormDialog
				mode="edit"
				card={editingCard}
				open={Boolean(editingCard)}
				onOpenChange={(open) => {
					if (!open) setEditingCard(null);
				}}
				packType={cardPack?.type}
				onSubmit={handleEdit}
			/>

			<DeleteCardDialog
				card={deleteCardTarget}
				open={Boolean(deleteCardTarget)}
				onOpenChange={(open) => {
					if (!open) setDeleteCardTarget(null);
				}}
				onConfirm={handleDelete}
				loading={pendingAction === "delete"}
			/>
		</div>
	);
}
