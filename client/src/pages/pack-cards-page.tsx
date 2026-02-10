import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { BulkCreateHanziDialog } from "@/features/cards/components/bulk-create-hanzi-dialog";
import { CardFormDialog } from "@/features/cards/components/card-form-dialog";
import { DeleteCardDialog } from "@/features/cards/components/delete-card-dialog";
import { PackCardsContent } from "@/features/cards/components/pack-cards-content";
import { PackCardsError } from "@/features/cards/components/pack-cards-error";
import { PackCardsHeader } from "@/features/cards/components/pack-cards-header";
import { PackCardsLoading } from "@/features/cards/components/pack-cards-loading";
import { useProfile } from "@/features/profile/profile-context";
import { createCard, deleteCard, listCards, updateCard } from "@/lib/api/card";
import { getCardPackById } from "@/lib/api/card-pack";
import { createApiClient } from "@/lib/api/client";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import { listSchedulingStatesByCardIds } from "@/lib/api/scheduling-state";
import type { Sm2State } from "@/lib/scheduling/types";

type CardSubmitPayload = {
	prompt: string;
	answer: string;
	question_content: CardEntity["question_content"];
	answer_content: CardEntity["answer_content"];
};

export function PackCardsPage() {
	const { t } = useTranslation();
	const { cardPackId } = useParams<{ cardPackId: string }>();
	const apiClient = useMemo(() => createApiClient(), []);
	const { currentProfile } = useProfile();
	const ownerUserId = currentProfile?.id ?? null;

	const [cardPack, setCardPack] = useState<CardPack | null>(null);
	const [cards, setCards] = useState<CardEntity[]>([]);
	const [schedulingStates, setSchedulingStates] = useState<
		CardSchedulingState[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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
		if (!cardPackId || !ownerUserId) return;
		setLoading(true);
		setError(null);

		Promise.all([
			getCardPackById(apiClient, cardPackId, ownerUserId),
			listCards(apiClient, ownerUserId, { cardPackId }),
		])
			.then(async ([pack, list]) => {
				if (!pack) {
					setError(t("errors.packNotFound"));
					setCardPack(null);
					setCards([]);
					setSchedulingStates([]);
					return;
				}
				setCardPack(pack);
				setCards(list);

				// Load scheduling states for due cards calculation
				if (list.length > 0) {
					const states = await listSchedulingStatesByCardIds(
						apiClient,
						ownerUserId,
						list.map((c) => c.id),
					);
					setSchedulingStates(states);
				} else {
					setSchedulingStates([]);
				}
			})
			.catch((err) =>
				setError(err instanceof Error ? err.message : t("errors.loadCards")),
			)
			.finally(() => setLoading(false));
	}, [apiClient, cardPackId, ownerUserId, t]);

	if (!cardPackId) {
		return <Navigate to="/" replace />;
	}
	if (!ownerUserId) {
		return null;
	}

	const handleCreate = async (values: CardSubmitPayload) => {
		if (!cardPackId) return;
		setPendingAction("create");
		try {
			const created = await createCard(apiClient, ownerUserId, {
				card_pack_id: cardPackId,
				prompt: values.prompt,
				answer: values.answer,
				question_content: values.question_content,
				answer_content: values.answer_content,
			});
			setCards((prev) => [...prev, created]);
			setCreateOpen(false);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.createCard"));
		} finally {
			setPendingAction(null);
		}
	};

	const handleCreateBulk = async (values: CardSubmitPayload[]) => {
		if (!cardPackId || values.length === 0) return;
		setPendingAction("create");
		try {
			const createdCards = await Promise.all(
				values.map((value) =>
					createCard(apiClient, ownerUserId, {
						card_pack_id: cardPackId,
						prompt: value.prompt,
						answer: value.answer,
						question_content: value.question_content,
						answer_content: value.answer_content,
					}),
				),
			);
			setCards((prev) => [...prev, ...createdCards]);
			setBulkCreateOpen(false);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.createCards"));
		} finally {
			setPendingAction(null);
		}
	};

	const handleEdit = async (values: CardSubmitPayload) => {
		if (!cardPackId || !editingCard) return;
		setPendingAction("edit");
		try {
			const updated = await updateCard(apiClient, editingCard.id, ownerUserId, {
				prompt: values.prompt,
				answer: values.answer,
				question_content: values.question_content,
				answer_content: values.answer_content,
			});
			setCards((prev) =>
				prev.map((card) => (card.id === editingCard.id ? updated : card)),
			);
			setEditingCard(null);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.updateCard"));
		} finally {
			setPendingAction(null);
		}
	};

	const handleDelete = async () => {
		if (!deleteCardTarget) return;
		setPendingAction("delete");
		try {
			await deleteCard(apiClient, deleteCardTarget.id, ownerUserId);
			setCards((prev) =>
				prev.filter((card) => card.id !== deleteCardTarget.id),
			);
			setDeleteCardTarget(null);
			setError(null);
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
				dueCardsCount={cardStatusCounts.due}
			/>

			<main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
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
