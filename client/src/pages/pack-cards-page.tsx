import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CardFormDialog } from "@/features/cards/components/card-form-dialog";
import { CardList } from "@/features/cards/components/card-list";
import { DeleteCardDialog } from "@/features/cards/components/delete-card-dialog";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import {
	createCard,
	deleteCard,
	listCards,
	updateCard,
} from "@/lib/api/card";
import { getCardPackById } from "@/lib/api/card-pack";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { createClient } from "@/lib/supabase/client";

export function PackCardsPage() {
	const { cardPackId } = useParams<{ cardPackId: string }>();
	const supabase = useMemo(() => createClient(), []);
	const { userId, loading: userLoading, error: userError } = useCurrentUser();

	const [cardPack, setCardPack] = useState<CardPack | null>(null);
	const [cards, setCards] = useState<CardEntity[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [createOpen, setCreateOpen] = useState(false);
	const [editingCard, setEditingCard] = useState<CardEntity | null>(null);
	const [deleteCardTarget, setDeleteCardTarget] = useState<CardEntity | null>(null);
	const [pendingAction, setPendingAction] = useState<"create" | "edit" | "delete" | null>(null);

	useEffect(() => {
		if (!userId || !cardPackId) return;
		setLoading(true);
		setError(null);

		Promise.all([
			getCardPackById(supabase, cardPackId, userId),
			listCards(supabase, userId, { cardPackId }),
		])
			.then(([pack, list]) => {
				if (!pack) {
					setError("Card pack not found or inaccessible.");
					setCardPack(null);
					setCards([]);
					return;
				}
				setCardPack(pack);
				setCards(list);
			})
			.catch((err) =>
				setError(err instanceof Error ? err.message : "Failed to load cards"),
			)
			.finally(() => setLoading(false));
	}, [supabase, userId, cardPackId]);

	if (!cardPackId) {
		return <Navigate to="/protected" replace />;
	}

	if (userLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-muted/20">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Spinner />
					<span>Loading your account...</span>
				</div>
			</div>
		);
	}

	if (!userId || userError) {
		return <Navigate to="/login" replace />;
	}

	const handleCreate = async (values: { prompt: string; answer: string }) => {
		if (!cardPackId || !userId) return;
		setPendingAction("create");
		try {
			const created = await createCard(supabase, userId, {
				card_pack_id: cardPackId,
				prompt: values.prompt,
				answer: values.answer,
			});
			setCards((prev) => [...prev, created]);
			setCreateOpen(false);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create card");
		} finally {
			setPendingAction(null);
		}
	};

	const handleEdit = async (values: { prompt: string; answer: string }) => {
		if (!cardPackId || !userId || !editingCard) return;
		setPendingAction("edit");
		try {
			const updated = await updateCard(supabase, editingCard.id, userId, values);
			setCards((prev) =>
				prev.map((card) => (card.id === editingCard.id ? updated : card)),
			);
			setEditingCard(null);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update card");
		} finally {
			setPendingAction(null);
		}
	};

	const handleDelete = async () => {
		if (!deleteCardTarget || !userId) return;
		setPendingAction("delete");
		try {
			await deleteCard(supabase, deleteCardTarget.id, userId);
			setCards((prev) => prev.filter((card) => card.id !== deleteCardTarget.id));
			setDeleteCardTarget(null);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete card");
		} finally {
			setPendingAction(null);
		}
	};

	return (
		<div className="min-h-screen bg-muted/20">
			<header className="border-b bg-background/80 backdrop-blur">
				<div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Link to="/protected" className="underline underline-offset-4">
								Card packs
							</Link>
							<span>/</span>
							<span className="text-foreground">{cardPack?.name ?? "Loading..."}</span>
						</div>
						<h1 className="text-2xl font-semibold">Cards</h1>
						<p className="text-sm text-muted-foreground">
							View and manage cards in this pack.
						</p>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" asChild>
							<Link to={`/pack/${cardPackId}/review`}>Review</Link>
						</Button>
						<Button onClick={() => setCreateOpen(true)}>
							<Plus className="size-4" />
							New card
						</Button>
					</div>
				</div>
			</header>

			<main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
				{error ? (
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				) : null}

				{loading ? (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Spinner />
						<span>Loading cards...</span>
					</div>
				) : (
					<Card>
						<CardHeader className="pb-4">
							<CardTitle className="text-xl">{cardPack?.name ?? "Card pack"}</CardTitle>
							<CardDescription>{cards.length} cards</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<CardList
								cards={cards}
								onEdit={(card) => setEditingCard(card)}
								onDelete={(card) => setDeleteCardTarget(card)}
							/>
						</CardContent>
					</Card>
				)}
			</main>

			<CardFormDialog
				mode="create"
				open={createOpen}
				onOpenChange={setCreateOpen}
				onSubmit={handleCreate}
			/>

			<CardFormDialog
				mode="edit"
				card={editingCard}
				open={Boolean(editingCard)}
				onOpenChange={(open) => {
					if (!open) setEditingCard(null);
				}}
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
