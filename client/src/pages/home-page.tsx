import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CardPackList } from "@/features/home/components/card-pack-list";
import { CreatePackDialog } from "@/features/home/components/create-pack-dialog";
import { DeletePackDialog } from "@/features/home/components/delete-pack-dialog";
import { EditPackDialog } from "@/features/home/components/edit-pack-dialog";
import { ExportPacksDialog } from "@/features/home/components/export-packs-dialog";
import { HomePageHeader } from "@/features/home/components/home-page-header";
import { ImportPacksDialog } from "@/features/home/components/import-packs-dialog";
import { useHomePage } from "@/features/home/hooks/use-home-page";
import { type CardPackType } from "@/lib/api/entities/card-pack";
import { useSystemPreferences } from "@/lib/preferences/system-preferences";

export function HomePage() {
	const state = useHomePage();
	const { setIsCreateOpen } = state;
	const navigate = useNavigate();
	const { preferences } = useSystemPreferences();
	const [searchParams, setSearchParams] = useSearchParams();
	const shouldOpenCreateDialog = searchParams.get("dialog") === "create-pack";

	useEffect(() => {
		if (!shouldOpenCreateDialog) return;
		setIsCreateOpen(true);

		const nextSearchParams = new URLSearchParams(searchParams);
		nextSearchParams.delete("dialog");
		setSearchParams(nextSearchParams, { replace: true });
	}, [searchParams, setIsCreateOpen, setSearchParams, shouldOpenCreateDialog]);

	const handleCreatePack = async (
		name: string,
		type: CardPackType,
	) => {
		const createdPackId = await state.createPack(name, type);
		if (!createdPackId) return null;
		navigate(`/pack/${createdPackId}/cards`);
		return createdPackId;
	};

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
				onCreate={handleCreatePack}
				enableMultiPackTypes={preferences.enableMultiPackTypes}
				defaultPackType={preferences.defaultCardPackType}
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
