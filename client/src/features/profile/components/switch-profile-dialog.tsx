import { Plus } from "lucide-react";
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
	const { profiles, currentProfile, switchProfile } = useProfile();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{t("profile.switch.title")}</DialogTitle>
					<DialogDescription>{t("profile.switch.description")}</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{profiles.map((profile) => {
						const isActive = currentProfile?.id === profile.id;
						return (
							<button
								key={profile.id}
								type="button"
								className={cn(
									"flex h-28 flex-col items-center justify-center gap-2 rounded-xl border bg-muted/20 p-3 text-center transition-colors",
									"hover:bg-accent",
									isActive && "border-primary bg-primary/10",
								)}
								onClick={() => {
									switchProfile(profile.id);
									onOpenChange(false);
								}}
							>
								<span className="text-3xl">{profile.avatar_emoji}</span>
								<span className="max-w-full truncate text-sm font-medium">
									{profile.nickname}
								</span>
								{isActive ? (
									<span className="text-xs text-primary">
										{t("profile.switch.current")}
									</span>
								) : null}
							</button>
						);
					})}

					<button
						type="button"
						className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/10 p-3 text-center transition-colors hover:bg-accent"
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

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
