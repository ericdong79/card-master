import { useCallback, useEffect, useMemo, useState } from "react";
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
import { LOCAL_OWNER_ID } from "@/lib/api/local-user";

export function useHomePage() {
	const apiClient = useMemo(() => createApiClient(), []);
	const ownerUserId = LOCAL_OWNER_ID;

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
		const packs = await listCardPacksWithCounts(apiClient, ownerUserId);
		setCardPacks(packs);
	}, [apiClient, ownerUserId]);

	useEffect(() => {
		refreshCardPacks()
			.catch((err) =>
				setError(err instanceof Error ? err.message : "Failed to load card packs"),
			)
			.finally(() => setLoading(false));
	}, [refreshCardPacks]);

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
			setError(err instanceof Error ? err.message : "Failed to create card pack");
		}
	}, [apiClient, closeCreateDialog, ownerUserId]);

	const editPack = useCallback(async (targetPack: CardPackWithCounts, name: string) => {
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
			setError(err instanceof Error ? err.message : "Failed to update card pack");
		}
	}, [apiClient, closeEditDialog, ownerUserId]);

	const deletePack = useCallback(async (pack: CardPackWithCounts) => {
		try {
			setError(null);
			setSuccessMessage(null);
			await deleteCardPack(apiClient, pack.id, ownerUserId);
			setCardPacks((prev) => prev.filter((item) => item.id !== pack.id));
			closeDeleteDialog();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete card pack");
		}
	}, [apiClient, closeDeleteDialog, ownerUserId]);

	const exportPacks = useCallback(
		async (cardPackIds: string[], includeReviewState: boolean) => {
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
				setError(err instanceof Error ? err.message : "Failed to export card packs");
			}
		},
		[apiClient, closeExportDialog, ownerUserId],
	);

	const importPacks = useCallback(
		async (file: File, importReviewState: boolean) => {
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
						? ` (${result.reviewEvents} review events, ${result.schedulingStates} scheduling states).`
						: ".";
				setSuccessMessage(
					`Imported ${result.cardPacks} pack(s) and ${result.cards} card(s)${reviewSummary}`,
				);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to import card packs");
			}
		},
		[apiClient, closeImportDialog, ownerUserId, refreshCardPacks],
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
