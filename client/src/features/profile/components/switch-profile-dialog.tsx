import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { useProfile } from "@/features/profile/profile-context";
import { cn } from "@/lib/utils";

type SwitchProfileDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateNew: () => void;
};

export function SwitchProfileDialog({
	open,
	onOpenChange,
	onCreateNew,
}: SwitchProfileDialogProps) {
	const { t } = useTranslation();
	const { profiles, currentProfile, switchProfile, deleteProfile } = useProfile();
	const [switchingProfileId, setSwitchingProfileId] = useState<string | null>(
		null,
	);
	const [deletingProfileId, setDeletingProfileId] = useState<string | null>(
		null,
	);
	const [confirmDeleteProfileId, setConfirmDeleteProfileId] = useState<
		string | null
	>(null);
	const [error, setError] = useState<string | null>(null);
	const busyProfileId = switchingProfileId ?? deletingProfileId;
	const confirmDeleteProfile =
		profiles.find((profile) => profile.id === confirmDeleteProfileId) ?? null;

	const handleSwitchProfile = async (profileId: string) => {
		if (profileId === currentProfile?.id || busyProfileId) return;
		setSwitchingProfileId(profileId);
		setError(null);
		try {
			await switchProfile(profileId);
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to switch profile", error);
			setError(t("profile.switch.switchFailed"));
		} finally {
			setSwitchingProfileId(null);
		}
	};

	const handleDeleteProfile = async () => {
		if (!confirmDeleteProfile || busyProfileId) return;
		setDeletingProfileId(confirmDeleteProfile.id);
		setError(null);
		try {
			await deleteProfile(confirmDeleteProfile.id);
			setConfirmDeleteProfileId(null);
		} catch (error) {
			console.error("Failed to delete profile", error);
			setError(t("profile.switch.deleteFailed"));
		} finally {
			setDeletingProfileId(null);
		}
	};

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (busyProfileId && !nextOpen) return;
					onOpenChange(nextOpen);
				}}
			>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>{t("profile.switch.title")}</DialogTitle>
						<DialogDescription>{t("profile.switch.description")}</DialogDescription>
					</DialogHeader>

					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{profiles.map((profile) => {
							const isActive = currentProfile?.id === profile.id;
							const isSwitching = switchingProfileId === profile.id;
							const isDeleting = deletingProfileId === profile.id;
							return (
								<div
									key={profile.id}
									className={cn(
										"relative flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border bg-muted/20 p-3 text-center transition-colors",
										isActive && "border-primary bg-primary/10",
									)}
								>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute top-1.5 right-1.5 size-7 text-muted-foreground hover:text-destructive"
										disabled={Boolean(busyProfileId)}
										aria-label={t("profile.switch.deleteProfile", {
											name: profile.nickname,
										})}
										onClick={() => setConfirmDeleteProfileId(profile.id)}
									>
										<Trash2 className="size-4" />
									</Button>
									<button
										type="button"
										className="flex w-full flex-1 flex-col items-center justify-center gap-2 rounded-lg px-2 pt-4 disabled:cursor-not-allowed disabled:opacity-70"
										disabled={Boolean(busyProfileId) || isActive}
										onClick={() => {
											void handleSwitchProfile(profile.id);
										}}
									>
										<span className="text-3xl">{profile.avatar_emoji}</span>
										<span className="max-w-full truncate text-sm font-medium">
											{profile.nickname}
										</span>
										{isSwitching || isDeleting ? (
											<span className="flex items-center gap-1 text-xs text-muted-foreground">
												<Spinner size="sm" />
												{isDeleting
													? t("profile.switch.deleting")
													: t("profile.switch.switching")}
											</span>
										) : isActive ? (
											<span className="text-xs text-primary">
												{t("profile.switch.current")}
											</span>
										) : null}
									</button>
								</div>
							);
						})}

						<button
							type="button"
							className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/10 p-3 text-center transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
							disabled={Boolean(busyProfileId)}
							onClick={() => {
								onOpenChange(false);
								onCreateNew();
							}}
						>
							<Plus className="size-6" />
							<span className="text-sm font-medium">
								{t("profile.switch.addProfile")}
							</span>
						</button>
					</div>

					{error ? (
						<p className="text-sm text-destructive">{error}</p>
					) : null}

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={Boolean(busyProfileId)}
						>
							{t("common.cancel")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(confirmDeleteProfile)}
				onOpenChange={(nextOpen) => {
					if (deletingProfileId && !nextOpen) return;
					if (!nextOpen) setConfirmDeleteProfileId(null);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t("profile.delete.title")}</DialogTitle>
						<DialogDescription>
							{t("profile.delete.description", {
								name: confirmDeleteProfile?.nickname ?? "",
							})}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setConfirmDeleteProfileId(null)}
							disabled={Boolean(deletingProfileId)}
						>
							{t("common.cancel")}
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								void handleDeleteProfile();
							}}
							disabled={Boolean(deletingProfileId)}
						>
							{deletingProfileId ? <Spinner size="sm" /> : <Trash2 className="size-4" />}
							{deletingProfileId
								? t("profile.switch.deleting")
								: t("profile.delete.confirm")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
