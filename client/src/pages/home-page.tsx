import { CardPackList } from "@/features/home/components/card-pack-list";
import { CreatePackDialog } from "@/features/home/components/create-pack-dialog";
import { DeletePackDialog } from "@/features/home/components/delete-pack-dialog";
import { EditPackDialog } from "@/features/home/components/edit-pack-dialog";
import { HomePageHeader } from "@/features/home/components/home-page-header";
import { useHomePage } from "@/features/home/hooks/use-home-page";

export function HomePage() {
	const state = useHomePage();

	return (
		<div className="min-h-screen bg-muted/20">
			<HomePageHeader onCreateClick={() => state.setIsCreateOpen(true)} />

			<main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
				{state.error ? (
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{state.error}
					</div>
				) : null}

				<CardPackList
					cardPacks={state.cardPacks}
					loading={state.loading}
					onCreateClick={() => state.setIsCreateOpen(true)}
					onEdit={state.startEditPack}
					onDelete={state.startDeletePack}
				/>
			</main>

				<CreatePackDialog
					open={state.isCreateOpen}
					onOpenChange={(open) => {
						if (!open) {
							state.closeCreateDialog();
							return;
						}
						state.setIsCreateOpen(open);
					}}
					onCreate={state.createPack}
				/>

				<EditPackDialog
					editingPack={state.editingPack}
				onOpenChange={(open) => {
					if (!open) {
							state.closeEditDialog();
						}
					}}
					onEdit={state.editPack}
				/>

				<DeletePackDialog
					deletingPack={state.deletingPack}
				onOpenChange={(open) => {
					if (!open) {
							state.closeDeleteDialog();
						}
					}}
					onDelete={state.deletePack}
				/>
		</div>
	);
}
