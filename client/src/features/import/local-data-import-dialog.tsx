import { AlertCircle, CheckCircle2, Database, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
	hasImportableLocalData,
	importLocalDataToCloud,
	inspectLocalDataImport,
	type LocalDataImportCounts,
	type LocalDataImportSummary,
} from "@/features/import/local-data-import";

type LocalDataImportDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	accountUserId: string | null;
	onImported?: () => Promise<void> | void;
};

function zeroCounts(): LocalDataImportCounts {
	return {
		profiles: 0,
		cardPacks: 0,
		cards: 0,
		schedulingProfiles: 0,
		schedulingStates: 0,
		reviewEvents: 0,
		cardMasteryStates: 0,
	};
}

export function LocalDataImportDialog({
	open,
	onOpenChange,
	accountUserId,
	onImported,
}: LocalDataImportDialogProps) {
	const { t } = useTranslation();
	const [counts, setCounts] = useState<LocalDataImportCounts>(zeroCounts);
	const [loadingCounts, setLoadingCounts] = useState(false);
	const [importing, setImporting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [refreshError, setRefreshError] = useState<string | null>(null);
	const [importedSummary, setImportedSummary] =
		useState<LocalDataImportSummary | null>(null);

	useEffect(() => {
		if (!open) return;

		let cancelled = false;
		setLoadingCounts(true);
		setError(null);
		setRefreshError(null);
		setImportedSummary(null);

		inspectLocalDataImport(accountUserId)
			.then((inspection) => {
				if (!cancelled) {
					setCounts(inspection.counts);
					if (inspection.completedMarker) {
						setImportedSummary({
							...inspection.completedMarker.counts,
							status: "already_imported",
							sourceFingerprint: inspection.completedMarker.source_fingerprint,
							completedAt: inspection.completedMarker.completed_at,
						});
					}
				}
			})
			.catch((loadError) => {
				console.error("Failed to inspect local data", loadError);
				if (!cancelled) {
					setCounts(zeroCounts());
					setError(t("import.local.errors.inspectFailed"));
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoadingCounts(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [accountUserId, open, t]);

	const canImport = useMemo(
		() =>
			Boolean(accountUserId) &&
			!loadingCounts &&
			!importing &&
			!importedSummary &&
			hasImportableLocalData(counts),
		[accountUserId, counts, importedSummary, importing, loadingCounts],
	);

	const countRows: Array<[keyof LocalDataImportCounts, string]> = [
		["profiles", t("import.local.counts.profiles")],
		["cardPacks", t("import.local.counts.cardPacks")],
		["cards", t("import.local.counts.cards")],
		["schedulingProfiles", t("import.local.counts.schedulingProfiles")],
		["schedulingStates", t("import.local.counts.schedulingStates")],
		["reviewEvents", t("import.local.counts.reviewEvents")],
		["cardMasteryStates", t("import.local.counts.cardMasteryStates")],
	];

	const handleImport = async () => {
		if (!accountUserId) return;

		setImporting(true);
		setError(null);
		setRefreshError(null);
		setImportedSummary(null);

		try {
			const summary = await importLocalDataToCloud(accountUserId);
			setCounts(summary);
			setImportedSummary(summary);
			try {
				await onImported?.();
			} catch (refreshFailure) {
				console.error("Failed to refresh imported cloud data", refreshFailure);
				setRefreshError(t("import.local.errors.refreshFailed"));
			}
		} catch (importError) {
			console.error("Failed to import local data", importError);
			setError(t("import.local.errors.importFailed"));
		} finally {
			setImporting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UploadCloud className="size-5" />
						{t("import.local.title")}
					</DialogTitle>
					<DialogDescription>{t("import.local.description")}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="rounded-md border bg-muted/20 p-4">
						<div className="mb-3 flex items-center gap-2 text-sm font-medium">
							<Database className="size-4" />
							{t("import.local.detectedData")}
						</div>
						{loadingCounts ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Spinner size="sm" />
								{t("import.local.inspecting")}
							</div>
						) : (
							<div className="grid gap-2 sm:grid-cols-2">
								{countRows.map(([key, label]) => (
									<div
										key={key}
										className="flex items-center justify-between rounded border bg-background px-3 py-2 text-sm"
									>
										<span className="text-muted-foreground">{label}</span>
										<span className="font-mono font-medium">{counts[key]}</span>
									</div>
								))}
							</div>
						)}
					</div>

					{importedSummary ? (
						<div className="flex items-start gap-2 rounded-md border border-emerald-400/50 bg-emerald-500/10 p-3 text-sm text-emerald-700">
							<CheckCircle2 className="mt-0.5 size-4 shrink-0" />
							<p>
								{t("import.local.success", {
									profiles: importedSummary.profiles,
									cardPacks: importedSummary.cardPacks,
									cards: importedSummary.cards,
									schedulingStates: importedSummary.schedulingStates,
									context:
										importedSummary.status === "already_imported"
											? "already"
											: "success",
								})}
							</p>
						</div>
					) : null}

					{error ? (
						<div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
							<AlertCircle className="mt-0.5 size-4 shrink-0" />
							<p>{error}</p>
						</div>
					) : null}

					{refreshError ? (
						<div className="flex items-start gap-2 rounded-md border border-amber-400/60 bg-amber-500/10 p-3 text-sm text-amber-800">
							<AlertCircle className="mt-0.5 size-4 shrink-0" />
							<p>{refreshError}</p>
						</div>
					) : null}

					{!loadingCounts && !hasImportableLocalData(counts) ? (
						<p className="text-sm text-muted-foreground">
							{t("import.local.empty")}
						</p>
					) : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={importing}
					>
						{t("common.cancel")}
					</Button>
					<Button type="button" onClick={handleImport} disabled={!canImport}>
						{importing ? <Spinner size="sm" /> : <UploadCloud className="size-4" />}
						{importing ? t("common.importing") : t("import.local.action")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
