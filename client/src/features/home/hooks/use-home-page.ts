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
import { LOCAL_OWNER_ID } from "@/lib/api/local-user";

export function useHomePage() {
	const apiClient = useMemo(() => createApiClient(), []);
	const ownerUserId = LOCAL_OWNER_ID;

	const [cardPacks, setCardPacks] = useState<CardPackWithCounts[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingPack, setEditingPack] = useState<CardPackWithCounts | null>(null);
	const [deletingPack, setDeletingPack] = useState<CardPackWithCounts | null>(null);

	useEffect(() => {
		listCardPacksWithCounts(apiClient, ownerUserId)
			.then(setCardPacks)
			.catch((err) =>
				setError(err instanceof Error ? err.message : "Failed to load card packs"),
			)
			.finally(() => setLoading(false));
	}, [apiClient, ownerUserId]);

	const closeCreateDialog = useCallback(() => {
		setIsCreateOpen(false);
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
			await deleteCardPack(apiClient, pack.id, ownerUserId);
			setCardPacks((prev) => prev.filter((item) => item.id !== pack.id));
			closeDeleteDialog();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete card pack");
		}
	}, [apiClient, closeDeleteDialog, ownerUserId]);

	return {
		cardPacks,
		loading,
		error,
		isCreateOpen,
		editingPack,
		deletingPack,
		setIsCreateOpen,
		closeCreateDialog,
		closeEditDialog,
		closeDeleteDialog,
		startEditPack,
		startDeletePack,
		createPack,
		editPack,
		deletePack,
	};
}
