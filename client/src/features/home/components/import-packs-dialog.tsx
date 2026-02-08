import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { parseCardMasterExport } from "@/lib/api/import-export";

type ImportPacksDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImport: (file: File, importReviewState: boolean) => Promise<void>;
};

export function ImportPacksDialog({
	open,
	onOpenChange,
	onImport,
}: ImportPacksDialogProps) {
	const [file, setFile] = useState<File | null>(null);
	const [hasReviewState, setHasReviewState] = useState(false);
	const [importReviewState, setImportReviewState] = useState(true);
	const [validationError, setValidationError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	useEffect(() => {
		if (!open) {
			setFile(null);
			setHasReviewState(false);
			setImportReviewState(true);
			setValidationError(null);
			setPending(false);
		}
	}, [open]);

	const handleFileChange = async (nextFile: File | null) => {
		setFile(nextFile);
		setValidationError(null);
		setHasReviewState(false);

		if (!nextFile) {
			return;
		}

		try {
			const text = await nextFile.text();
			const payload = parseCardMasterExport(text);
			setHasReviewState(Boolean(payload.review_state));
		} catch (error) {
			setValidationError(
				error instanceof Error ? error.message : "Unable to read import file.",
			);
		}
	};

	const handleSubmit = async () => {
		if (!file || validationError) {
			return;
		}

		setPending(true);
		try {
			await onImport(file, hasReviewState ? importReviewState : false);
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="space-y-4">
				<DialogHeader>
					<DialogTitle>Import card packs</DialogTitle>
					<DialogDescription>
						Import card packs from an exported JSON file.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2">
					<Label htmlFor="import-packs-file">Export file</Label>
					<Input
						id="import-packs-file"
						type="file"
						accept=".json,application/json"
						onChange={(event) => {
							const nextFile = event.target.files?.[0] ?? null;
							void handleFileChange(nextFile);
						}}
					/>
				</div>

				{hasReviewState ? (
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={importReviewState}
							onChange={(event) => setImportReviewState(event.target.checked)}
							className="size-4 rounded border-input"
						/>
						<span>Import review history and schedule state</span>
					</label>
				) : file && !validationError ? (
					<p className="text-sm text-muted-foreground">
						This file does not include review history or schedule state.
					</p>
				) : null}

				{validationError ? (
					<p className="text-sm text-destructive" role="alert">
						{validationError}
					</p>
				) : null}

				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!file || Boolean(validationError) || pending}>
						{pending ? (
							<>
								<Spinner size="sm" className="text-primary-foreground" />
								Importing...
							</>
						) : (
							"Import"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
