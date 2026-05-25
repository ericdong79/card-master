import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { type CardPackType } from "@/lib/api/entities/card-pack";
import {
	createCardPackRepository,
	type CardPackWithCounts,
} from "@/lib/data/repositories/card-pack-repository";
import { createDashboardRepository } from "@/lib/data/repositories/dashboard-repository";
import { createImportExportRepository } from "@/lib/data/repositories/import-export-repository";
import { useAuth } from "@/features/auth/use-auth";
import { useProfile } from "@/features/profile/profile-context";

export function useHomePage() {
	const { t } = useTranslation();
	const dashboardRepository = useMemo(() => createDashboardRepository(), []);
	const cardPackRepository = useMemo(() => createCardPackRepository(), []);
	const importExportRepository = useMemo(() => createImportExportRepository(), []);
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
		const dashboard = await dashboardRepository.loadHomeDashboard({
			accountUserId,
			profileId,
		});
		return {
			packs: dashboard.cardPacks,
			dueCount: dashboard.dueCardsCount,
		};
	}, [accountUserId, dashboardRepository, profileId]);

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
			const created = await cardPackRepository.createCardPack({
				accountUserId,
				profileId,
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
	}, [accountUserId, cardPackRepository, closeCreateDialog, profileId, t]);

	const editPack = useCallback(async (targetPack: CardPackWithCounts, name: string) => {
		if (!accountUserId || !profileId) return;
		try {
			setError(null);
			setSuccessMessage(null);
			const updated = await cardPackRepository.updateCardPack({
				accountUserId,
				profileId,
				cardPackId: targetPack.id,
				updates: {
					name: name.trim(),
				},
			});
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
	}, [accountUserId, cardPackRepository, closeEditDialog, profileId, t]);

	const deletePack = useCallback(async (pack: CardPackWithCounts) => {
		if (!accountUserId || !profileId) return;
		try {
			setError(null);
			setSuccessMessage(null);
			await cardPackRepository.deletePackWithData({
				accountUserId,
				profileId,
				cardPackId: pack.id,
			});
			setCardPacks((prev) => prev.filter((item) => item.id !== pack.id));
			closeDeleteDialog();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.deleteCardPack"));
		}
	}, [accountUserId, cardPackRepository, closeDeleteDialog, profileId, t]);

	const exportPacks = useCallback(
		async (cardPackIds: string[], includeReviewState: boolean) => {
			if (!accountUserId || !profileId) return;
			try {
				setError(null);
				setSuccessMessage(null);
				const payload = await importExportRepository.buildCardMasterExport({
					accountUserId,
					profileId,
					cardPackIds,
					includeReviewState,
				});
				importExportRepository.downloadCardMasterExport(payload);
				closeExportDialog();
			} catch (err) {
				setError(err instanceof Error ? err.message : t("errors.exportCardPacks"));
			}
		},
		[accountUserId, closeExportDialog, importExportRepository, profileId, t],
	);

	const importPacks = useCallback(
		async (file: File, importReviewState: boolean) => {
			if (!accountUserId || !profileId) return;
			try {
				setError(null);
				setSuccessMessage(null);
				const text = await file.text();
				const payload = importExportRepository.parseCardMasterExport(text);
				const result = await importExportRepository.importCardMasterData({
					accountUserId,
					profileId,
					payload,
					importReviewState,
				});
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
		[
			accountUserId,
			closeImportDialog,
			importExportRepository,
			profileId,
			refreshCardPacks,
			t,
		],
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
