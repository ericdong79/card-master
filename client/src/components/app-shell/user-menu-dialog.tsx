import { LogOut, Settings2, UploadCloud, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/use-auth";
import { useAppShellModals } from "./modals-context";

export type UserMenuDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/**
 * Profile / account menu dialog. Owns its own sign-out state.
 *
 * Wires its sub-actions (switch profile, preferences, local-import) through
 * the AppShellModalsContext so other shell affordances can reuse them.
 */
export function UserMenuDialog({ open, onOpenChange }: UserMenuDialogProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { error: authError, signOut } = useAuth();
	const { openSwitchProfile, openLocalImport } = useAppShellModals();

	const [signingOut, setSigningOut] = useState(false);
	const [signOutError, setSignOutError] = useState<string | null>(null);

	const handleSignOut = async () => {
		setSigningOut(true);
		setSignOutError(null);
		try {
			await signOut();
			onOpenChange(false);
		} catch (error) {
			console.error("Firebase sign-out failed", error);
			setSignOutError(t("auth.signOutFailed"));
		} finally {
			setSigningOut(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogTitle>{t("profile.menu.title")}</DialogTitle>
				<div className="space-y-2 pt-2">
					<Button
						className="w-full justify-start"
						variant="outline"
						onClick={() => {
							onOpenChange(false);
							openSwitchProfile();
						}}
					>
						<Users className="size-4" />
						{t("profile.menu.switchUser")}
					</Button>
					<Button
						className="w-full justify-start"
						variant="outline"
						onClick={() => {
							onOpenChange(false);
							navigate("/preferences");
						}}
					>
						<Settings2 className="size-4" />
						{t("profile.menu.preferences")}
					</Button>
					<Button
						className="w-full justify-start"
						variant="outline"
						onClick={() => {
							onOpenChange(false);
							openLocalImport();
						}}
					>
						<UploadCloud className="size-4" />
						{t("profile.menu.importLocalData")}
					</Button>
					<Button
						className="w-full justify-start"
						variant="outline"
						onClick={handleSignOut}
						disabled={signingOut}
					>
						{signingOut ? (
							<Spinner size="sm" />
						) : (
							<LogOut className="size-4" />
						)}
						{t("auth.signOut")}
					</Button>
					{signOutError ? (
						<p className="text-sm text-destructive">{signOutError}</p>
					) : null}
					{authError ? (
						<p className="text-sm text-destructive">
							{t("auth.unavailable")}
						</p>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
