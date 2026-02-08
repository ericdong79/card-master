import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createApiClient } from "@/lib/api/client";
import {
	createCardPack,
	deleteCardPack,
	listCardPacksWithCounts,
	type CardPackWithCounts,
	updateCardPack,
} from "@/lib/api/card-pack";
import { type CardPackType } from "@/lib/api/entities/card-pack";
import {
	buildCardMasterExport,
	downloadCardMasterExport,
	importCardMasterData,
	parseCardMasterExport,
} from "@/lib/api/import-export";
import { useProfile } from "@/features/profile/profile-context";

export function useHomePage() {
	const { t } = useTranslation();
	const apiClient = useMemo(() => createApiClient(), []);
	const { currentProfile } = useProfile();
	const ownerUserId = currentProfile?.id ?? null;

	const [cardPacks, setCardPacks] = useState<CardPackWithCounts[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isExportOpen, setIsExportOpen] = useState(false);
	const [isImportOpen, setIsImportOpen] = useState(false);
	const [editingPack, setEditingPack] = useState<CardPackWithCounts | null>(null);
	const [deletingPack, setDeletingPack] = useState<CardPackWithCounts | null>(null);

	const refreshCardPacks = useCallback(async () => {
		if (!ownerUserId) {
			setCardPacks([]);
			return;
		}
		const packs = await listCardPacksWithCounts(apiClient, ownerUserId);
		setCardPacks(packs);
	}, [apiClient, ownerUserId]);

	useEffect(() => {
		refreshCardPacks()
			.catch((err) =>
				setError(err instanceof Error ? err.message : t("errors.loadCardPacks")),
			)
			.finally(() => setLoading(false));
	}, [refreshCardPacks, t]);

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
		if (!ownerUserId) return;
		try {
			setError(null);
			setSuccessMessage(null);
			const created = await createCardPack(apiClient, ownerUserId, {
				name: name.trim(),
				type,
			});
			setCardPacks((prev) => [...prev, { ...created, cards_count: 0 }]);
			closeCreateDialog();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.createCardPack"));
		}
	}, [apiClient, closeCreateDialog, ownerUserId, t]);

	const editPack = useCallback(async (targetPack: CardPackWithCounts, name: string) => {
		if (!ownerUserId) return;
		try {
			setError(null);
			setSuccessMessage(null);
			const updated = await updateCardPack(apiClient, targetPack.id, ownerUserId, {
				name: name.trim(),
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
	}, [apiClient, closeEditDialog, ownerUserId, t]);

	const deletePack = useCallback(async (pack: CardPackWithCounts) => {
		if (!ownerUserId) return;
		try {
			setError(null);
			setSuccessMessage(null);
			await deleteCardPack(apiClient, pack.id, ownerUserId);
			setCardPacks((prev) => prev.filter((item) => item.id !== pack.id));
			closeDeleteDialog();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.deleteCardPack"));
		}
	}, [apiClient, closeDeleteDialog, ownerUserId, t]);

	const exportPacks = useCallback(
		async (cardPackIds: string[], includeReviewState: boolean) => {
			if (!ownerUserId) return;
			try {
				setError(null);
				setSuccessMessage(null);
				const payload = await buildCardMasterExport(apiClient, ownerUserId, {
					cardPackIds,
					includeReviewState,
				});
				downloadCardMasterExport(payload);
				closeExportDialog();
			} catch (err) {
				setError(err instanceof Error ? err.message : t("errors.exportCardPacks"));
			}
		},
		[apiClient, closeExportDialog, ownerUserId, t],
	);

	const importPacks = useCallback(
		async (file: File, importReviewState: boolean) => {
			if (!ownerUserId) return;
			try {
				setError(null);
				setSuccessMessage(null);
				const text = await file.text();
				const payload = parseCardMasterExport(text);
				const result = await importCardMasterData(apiClient, ownerUserId, payload, {
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
		[apiClient, closeImportDialog, ownerUserId, refreshCardPacks, t],
	);

	return {
		cardPacks,
		loading,
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
