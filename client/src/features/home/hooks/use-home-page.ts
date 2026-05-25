import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createApiClient } from "@/lib/api/client";
import {
	createCardPack,
	deleteCardPack,
	listCardPacks,
	type CardPackWithCounts,
	updateCardPack,
} from "@/lib/api/card-pack";
import { listCards } from "@/lib/api/card";
import { type CardPackType } from "@/lib/api/entities/card-pack";
import { listSchedulingStatesByCardIds } from "@/lib/api/scheduling-state";
import {
	buildCardMasterExport,
	downloadCardMasterExport,
	importCardMasterData,
	parseCardMasterExport,
} from "@/lib/api/import-export";
import { useAuth } from "@/features/auth/use-auth";
import { useProfile } from "@/features/profile/profile-context";

export function useHomePage() {
	const { t } = useTranslation();
	const apiClient = useMemo(() => createApiClient(), []);
	const { accountUserId } = useAuth();
	const { currentProfile } = useProfile();
	const profileId = currentProfile?.id ?? null;
	const currentScopeKey =
		accountUserId && profileId ? `${accountUserId}:${profileId}` : "no-profile";

	const [cardPacks, setCardPacks] = useState<CardPackWithCounts[]>([]);
	const [dueCardsCount, setDueCardsCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isExportOpen, setIsExportOpen] = useState(false);
	const [isImportOpen, setIsImportOpen] = useState(false);
	const [editingPack, setEditingPack] = useState<CardPackWithCounts | null>(null);
	const [deletingPack, setDeletingPack] = useState<CardPackWithCounts | null>(null);

	const loadCardPackData = useCallback(async () => {
		if (!accountUserId || !profileId) {
			return { packs: [], dueCount: 0 };
		}
		const [cardPacks, cards] = await Promise.all([
			listCardPacks(apiClient, accountUserId, profileId),
			listCards(apiClient, accountUserId, profileId),
		]);
		const countsMap = new Map<string, number>();
		for (const card of cards) {
			countsMap.set(
				card.card_pack_id,
				(countsMap.get(card.card_pack_id) ?? 0) + 1,
			);
		}
		const packs = cardPacks.map((pack) => ({
			...pack,
			cards_count: countsMap.get(pack.id) ?? 0,
		}));
		const states =
			cards.length > 0
				? await listSchedulingStatesByCardIds(
						apiClient,
						accountUserId,
						profileId,
						cards.map((card) => card.id),
					)
				: [];
		const now = new Date();
		const stateByCardId = new Map(states.map((state) => [state.card_id, state]));
		const dueCount = cards.reduce((count, card) => {
			const state = stateByCardId.get(card.id);
			if (!state) return count + 1;
			return new Date(state.due_at) <= now ? count + 1 : count;
		}, 0);
		return { packs, dueCount };
	}, [accountUserId, apiClient, profileId]);

	const refreshCardPacks = useCallback(async () => {
		const { packs, dueCount } = await loadCardPackData();
		setCardPacks(packs);
		setDueCardsCount(dueCount);
	}, [loadCardPackData]);

	useEffect(() => {
		let cancelled = false;

		Promise.resolve()
			.then(loadCardPackData)
			.then(({ packs, dueCount }) => {
				if (!cancelled) {
					setError(null);
					setCardPacks(packs);
					setDueCardsCount(dueCount);
				}
			})
			.catch((err) => {
				if (!cancelled) {
					setError(
						err instanceof Error ? err.message : t("errors.loadCardPacks"),
					);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoadedScopeKey(currentScopeKey);
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [currentScopeKey, loadCardPackData, t]);

	const closeCreateDialog = useCallback(() => {
		setIsCreateOpen(false);
	}, []);

	const closeExportDialog = useCallback(() => {
		setIsExportOpen(false);
	}, []);

	const closeImportDialog = useCallback(() => {
		setIsImportOpen(false);
	}, []);

	const closeEditDialog = useCallback(() => {
		setEditingPack(null);
	}, []);

	const closeDeleteDialog = useCallback(() => {
		setDeletingPack(null);
	}, []);

	const startEditPack = useCallback((pack: CardPackWithCounts) => {
		setEditingPack(pack);
	}, []);

	const startDeletePack = useCallback((pack: CardPackWithCounts) => {
		setDeletingPack(pack);
	}, []);

	const createPack = useCallback(async (name: string, type: CardPackType) => {
		if (!accountUserId || !profileId) return null;
		try {
			setError(null);
			setSuccessMessage(null);
			const created = await createCardPack(apiClient, accountUserId, profileId, {
				name: name.trim(),
				type,
			});
			setCardPacks((prev) => [...prev, { ...created, cards_count: 0 }]);
			closeCreateDialog();
			return created.id;
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.createCardPack"));
			return null;
		}
	}, [accountUserId, apiClient, closeCreateDialog, profileId, t]);

	const editPack = useCallback(async (targetPack: CardPackWithCounts, name: string) => {
		if (!accountUserId || !profileId) return;
		try {
			setError(null);
			setSuccessMessage(null);
			const updated = await updateCardPack(
				apiClient,
				accountUserId,
				profileId,
				targetPack.id,
				{
					name: name.trim(),
				},
			);
			setCardPacks((prev) =>
				prev.map((pack) =>
					pack.id === targetPack.id
						? {
								...pack,
								...(updated ?? { name: name.trim() }),
							}
						: pack,
				),
			);
			closeEditDialog();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.updateCardPack"));
		}
	}, [accountUserId, apiClient, closeEditDialog, profileId, t]);

	const deletePack = useCallback(async (pack: CardPackWithCounts) => {
		if (!accountUserId || !profileId) return;
		try {
			setError(null);
			setSuccessMessage(null);
			await deleteCardPack(apiClient, accountUserId, profileId, pack.id);
			setCardPacks((prev) => prev.filter((item) => item.id !== pack.id));
			closeDeleteDialog();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.deleteCardPack"));
		}
	}, [accountUserId, apiClient, closeDeleteDialog, profileId, t]);

	const exportPacks = useCallback(
		async (cardPackIds: string[], includeReviewState: boolean) => {
			if (!accountUserId || !profileId) return;
			try {
				setError(null);
				setSuccessMessage(null);
				const payload = await buildCardMasterExport(
					apiClient,
					accountUserId,
					profileId,
					{
						cardPackIds,
						includeReviewState,
					},
				);
				downloadCardMasterExport(payload);
				closeExportDialog();
			} catch (err) {
				setError(err instanceof Error ? err.message : t("errors.exportCardPacks"));
			}
		},
		[accountUserId, apiClient, closeExportDialog, profileId, t],
	);

	const importPacks = useCallback(
		async (file: File, importReviewState: boolean) => {
			if (!accountUserId || !profileId) return;
			try {
				setError(null);
				setSuccessMessage(null);
				const text = await file.text();
				const payload = parseCardMasterExport(text);
				const result = await importCardMasterData(
					apiClient,
					accountUserId,
					profileId,
					payload,
					{
						importReviewState,
					},
				);
				await refreshCardPacks();
				closeImportDialog();

				const reviewSummary =
					result.reviewEvents > 0 || result.schedulingStates > 0
						? t("success.importedWithReview", {
								packs: result.cardPacks,
								cards: result.cards,
								reviewEvents: result.reviewEvents,
								schedulingStates: result.schedulingStates,
							})
						: t("success.importedBasic", {
								packs: result.cardPacks,
								cards: result.cards,
							});
				setSuccessMessage(reviewSummary);
			} catch (err) {
				setError(err instanceof Error ? err.message : t("errors.importCardPacks"));
			}
		},
		[accountUserId, apiClient, closeImportDialog, profileId, refreshCardPacks, t],
	);

	return {
		cardPacks,
		dueCardsCount,
		loading: loading || loadedScopeKey !== currentScopeKey,
		error,
		successMessage,
		isCreateOpen,
		isExportOpen,
		isImportOpen,
		editingPack,
		deletingPack,
		setIsCreateOpen,
		setIsExportOpen,
		setIsImportOpen,
		closeCreateDialog,
		closeExportDialog,
		closeImportDialog,
		closeEditDialog,
		closeDeleteDialog,
		startEditPack,
		startDeletePack,
		createPack,
		editPack,
		deletePack,
		exportPacks,
		importPacks,
	};
}
