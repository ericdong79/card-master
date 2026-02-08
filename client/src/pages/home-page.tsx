import { CardPackList } from "@/features/home/components/card-pack-list";
import { CreatePackDialog } from "@/features/home/components/create-pack-dialog";
import { DeletePackDialog } from "@/features/home/components/delete-pack-dialog";
import { EditPackDialog } from "@/features/home/components/edit-pack-dialog";
import { ExportPacksDialog } from "@/features/home/components/export-packs-dialog";
import { HomePageHeader } from "@/features/home/components/home-page-header";
import { ImportPacksDialog } from "@/features/home/components/import-packs-dialog";
import { useHomePage } from "@/features/home/hooks/use-home-page";

export function HomePage() {
	const state = useHomePage();

	return (
		<div className="min-h-screen bg-muted/20">
			<HomePageHeader
				onExportClick={() => state.setIsExportOpen(true)}
				onImportClick={() => state.setIsImportOpen(true)}
				onCreateClick={() => state.setIsCreateOpen(true)}
			/>

			<main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
				{state.error ? (
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{state.error}
					</div>
				) : null}
				{state.successMessage ? (
					<div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
						{state.successMessage}
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

			<ExportPacksDialog
				open={state.isExportOpen}
				cardPacks={state.cardPacks}
				onOpenChange={(open) => {
					if (!open) {
						state.closeExportDialog();
						return;
					}
					state.setIsExportOpen(open);
				}}
				onExport={state.exportPacks}
			/>

			<ImportPacksDialog
				open={state.isImportOpen}
				onOpenChange={(open) => {
					if (!open) {
						state.closeImportDialog();
						return;
					}
					state.setIsImportOpen(open);
				}}
				onImport={state.importPacks}
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
