import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Edit3, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
	createCardPack,
	deleteCardPack,
	listCardPacksWithCounts,
	type CardPackWithCounts,
	updateCardPack,
} from "@/lib/api/card-pack";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PendingAction = "create" | "edit" | "delete" | null;

export function HomePage() {
	const supabase = useMemo(() => createClient(), []);
	const { userId, loading: userLoading, error: userError } = useCurrentUser();

	const [cardPacks, setCardPacks] = useState<CardPackWithCounts[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newPackName, setNewPackName] = useState("");

	const [editingPack, setEditingPack] = useState<CardPackWithCounts | null>(null);
	const [editName, setEditName] = useState("");

	const [deletingPack, setDeletingPack] = useState<CardPackWithCounts | null>(null);
	const [pendingAction, setPendingAction] = useState<PendingAction>(null);

	const closeEditDialog = () => {
		setEditingPack(null);
		setEditName("");
	};

	const closeDeleteDialog = () => {
		setDeletingPack(null);
	};

	useEffect(() => {
		if (!userId) return;

		setLoading(true);
		setError(null);

		listCardPacksWithCounts(supabase, userId)
			.then(setCardPacks)
			.catch((err) =>
				setError(err instanceof Error ? err.message : "Failed to load card packs"),
			)
			.finally(() => setLoading(false));
	}, [supabase, userId]);

	const handleCreatePack = async () => {
		if (!userId || !newPackName.trim()) return;
		setPendingAction("create");

		try {
			const created = await createCardPack(supabase, userId, {
				name: newPackName.trim(),
			});
			setCardPacks((prev) => [...prev, { ...created, cards_count: 0 }]);
			setIsCreateOpen(false);
			setNewPackName("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create card pack");
		} finally {
			setPendingAction(null);
		}
	};

	const handleStartEdit = (pack: CardPackWithCounts) => {
		setEditingPack(pack);
		setEditName(pack.name);
	};

	const handleEditPack = async () => {
		if (!userId || !editingPack || !editName.trim()) return;
		setPendingAction("edit");

		try {
			const updated = await updateCardPack(supabase, editingPack.id, userId, {
				name: editName.trim(),
			});
			setCardPacks((prev) =>
				prev.map((pack) =>
					pack.id === editingPack.id
						? { ...pack, ...(updated ?? { name: editName.trim() }) }
						: pack,
				),
			);
			closeEditDialog();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update card pack");
		} finally {
			setPendingAction(null);
		}
	};

	const handleDeletePack = async () => {
		if (!userId || !deletingPack) return;
		setPendingAction("delete");

		try {
			await deleteCardPack(supabase, deletingPack.id, userId);
			setCardPacks((prev) => prev.filter((pack) => pack.id !== deletingPack.id));
			closeDeleteDialog();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete card pack");
		} finally {
			setPendingAction(null);
		}
	};

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

	return (
		<div className="min-h-screen bg-muted/20">
			<header className="border-b bg-background/80 backdrop-blur">
				<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
					<div>
						<h1 className="text-2xl font-semibold">Card Packs</h1>
						<p className="text-sm text-muted-foreground">
							Manage your decks and keep track of what to review.
						</p>
					</div>
					<Button onClick={() => setIsCreateOpen(true)}>
						<Plus className="size-4" />
						New card pack
					</Button>
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
						<span>Loading card packs...</span>
					</div>
				) : cardPacks.length === 0 ? (
					<Card className="border-dashed bg-background/60">
						<CardHeader>
							<CardTitle>No card packs yet</CardTitle>
							<CardDescription>
								Create your first pack to start adding cards.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button onClick={() => setIsCreateOpen(true)}>
								<Plus className="size-4" />
								Create a card pack
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2">
						{cardPacks.map((pack) => (
							<CardPackTile
								key={pack.id}
								pack={pack}
								onEdit={() => handleStartEdit(pack)}
								onDelete={() => setDeletingPack(pack)}
							/>
						))}
					</div>
				)}
			</main>

			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="space-y-4">
					<DialogHeader>
						<DialogTitle>Create card pack</DialogTitle>
						<DialogDescription>Add a new pack to group your cards.</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="new-pack-name">Name</Label>
						<Input
							id="new-pack-name"
							value={newPackName}
							onChange={(e) => setNewPackName(e.target.value)}
							placeholder="My first pack"
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreatePack} disabled={pendingAction === "create"}>
							{pendingAction === "create" ? (
								<>
									<Spinner size="sm" className="text-primary-foreground" />
									Creating...
								</>
							) : (
								"Create"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(editingPack)}
				onOpenChange={(open) => {
					if (!open) {
						closeEditDialog();
					}
				}}
			>
				<DialogContent className="space-y-4">
					<DialogHeader>
						<DialogTitle>Rename card pack</DialogTitle>
						<DialogDescription>Update the name shown on your home screen.</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="edit-pack-name">Name</Label>
						<Input
							id="edit-pack-name"
							value={editName}
							onChange={(e) => setEditName(e.target.value)}
							placeholder="Updated card pack name"
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={closeEditDialog}>
							Cancel
						</Button>
						<Button onClick={handleEditPack} disabled={pendingAction === "edit"}>
							{pendingAction === "edit" ? (
								<>
									<Spinner size="sm" className="text-primary-foreground" />
									Saving...
								</>
							) : (
								"Save"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(deletingPack)}
				onOpenChange={(open) => {
					if (!open) {
						closeDeleteDialog();
					}
				}}
			>
				<DialogContent className="space-y-4">
					<DialogHeader>
						<DialogTitle>Delete card pack</DialogTitle>
						<DialogDescription>
							This removes the pack and its cards. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						Are you sure you want to delete{" "}
						<span className="font-medium text-foreground">
							{deletingPack?.name ?? "this pack"}
						</span>
						?
					</p>
					<DialogFooter>
						<Button variant="ghost" onClick={closeDeleteDialog}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeletePack}
							disabled={pendingAction === "delete"}
						>
							{pendingAction === "delete" ? (
								<>
									<Spinner size="sm" className="text-primary-foreground" />
									Deleting...
								</>
							) : (
								"Delete"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

type CardPackTileProps = {
	pack: CardPackWithCounts;
	onEdit: () => void;
	onDelete: () => void;
};

function CardPackTile({ pack, onEdit, onDelete }: CardPackTileProps) {
	const createdAt = new Date(pack.created_at).toLocaleString();

	return (
		<Card className="group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
			<Link to={`/pack/${pack.id}/cards`} className="absolute inset-0" aria-label={pack.name} />
			<div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
				<Button
					size="icon-sm"
					variant="ghost"
					className="bg-background/80 hover:bg-accent"
					onClick={(e) => {
						e.preventDefault();
						onEdit();
					}}
				>
					<Edit3 className="size-4" />
				</Button>
				<Button
					size="icon-sm"
					variant="ghost"
					className="bg-background/80 hover:bg-destructive/10 hover:text-destructive"
					onClick={(e) => {
						e.preventDefault();
						onDelete();
					}}
				>
					<Trash2 className="size-4" />
				</Button>
			</div>
			<CardHeader className={cn("pb-2 pr-24", pack.cards_count === 0 && "pb-4")}>
				<CardTitle className="text-lg">{pack.name}</CardTitle>
				<CardDescription>{pack.cards_count} cards</CardDescription>
			</CardHeader>
			<CardContent className="text-sm text-muted-foreground">
				Created {createdAt}
			</CardContent>
		</Card>
	);
}
