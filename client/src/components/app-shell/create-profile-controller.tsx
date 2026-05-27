import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CreateProfileDialog } from "@/features/profile/components/create-profile-dialog";
import { useProfile } from "@/features/profile/profile-context";

export type CreateProfileControllerHandle = {
	/**
	 * Imperatively open the create-profile dialog (e.g. from "Create new"
	 * inside the switch-profile dialog). Bypasses the empty-profiles guard
	 * so the dialog is closable again afterwards.
	 */
	open: () => void;
};

export type CreateProfileControllerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/**
	 * Called when the dialog needs to be opened in "create from empty"
	 * mode — disables the close affordance until a profile exists.
	 */
	onAutoForceOpen?: () => void;
};

/**
 * Owns:
 *   - create-profile dialog form-submission state (loading / error)
 *   - the auto-force-open effect when the user has zero profiles
 *
 * The shell still owns the open flag because multiple call sites toggle it
 * (the switch-profile dialog's "create new" button, the auto-force effect).
 */
export function CreateProfileController({
	open,
	onOpenChange,
	onAutoForceOpen,
}: CreateProfileControllerProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { ready, profiles, createProfile } = useProfile();

	const [creating, setCreating] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const forcedOpenRef = useRef(false);

	const mustCreateProfile = ready && profiles.length === 0;

	useEffect(() => {
		if (mustCreateProfile) {
			forcedOpenRef.current = true;
			onAutoForceOpen?.();
			return;
		}
		if (forcedOpenRef.current) {
			forcedOpenRef.current = false;
			onOpenChange(false);
		}
	}, [mustCreateProfile, onAutoForceOpen, onOpenChange]);

	return (
		<CreateProfileDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					forcedOpenRef.current = false;
				}
				onOpenChange(nextOpen);
				if (nextOpen) {
					setErrorMessage(null);
				}
			}}
			allowClose={!mustCreateProfile}
			isCreating={creating}
			errorMessage={errorMessage}
			onCreate={async (input) => {
				const isFirstProfile = profiles.length === 0;
				setCreating(true);
				setErrorMessage(null);
				try {
					await createProfile(input);
					forcedOpenRef.current = false;
					onOpenChange(false);
					if (isFirstProfile) {
						navigate("/quick-start", { replace: true });
					}
				} catch (error) {
					console.error("Failed to create profile", error);
					setErrorMessage(t("auth.unavailable"));
				} finally {
					setCreating(false);
				}
			}}
		/>
	);
}
