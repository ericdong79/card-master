import { Palette, SmilePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { SafeEmojiPicker } from "@/components/safe-emoji-picker";
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
import { cn } from "@/lib/utils";

const DEFAULT_AVATAR = "🐝";
const DEFAULT_COLOR = "#1f1f23";

type CreateProfileDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (input: {
		nickname: string;
		avatarEmoji: string;
		primaryColor: string | null;
	}) => void;
	allowClose: boolean;
};

export function CreateProfileDialog({
	open,
	onOpenChange,
	onCreate,
	allowClose,
}: CreateProfileDialogProps) {
	const { t } = useTranslation();
	const [nickname, setNickname] = useState("");
	const [avatarEmoji, setAvatarEmoji] = useState(DEFAULT_AVATAR);
	const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLOR);
	const [error, setError] = useState<string | null>(null);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);

	useEffect(() => {
		if (!open) {
			setNickname("");
			setAvatarEmoji(DEFAULT_AVATAR);
			setPrimaryColor(DEFAULT_COLOR);
			setError(null);
			setShowEmojiPicker(false);
		}
	}, [open]);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!allowClose && !next) return;
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{t("profile.create.title")}</DialogTitle>
					<DialogDescription>
						{t("profile.create.description")}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<p className="text-xs text-muted-foreground">
						{t("profile.create.note")}
					</p>

					<div className="space-y-2">
						<Label htmlFor="profile-nickname">
							{t("profile.fields.nickname")}
						</Label>
						<Input
							id="profile-nickname"
							value={nickname}
							onChange={(event) => setNickname(event.target.value)}
							placeholder={t("profile.fields.nicknamePlaceholder")}
						/>
					</div>

					<div className="space-y-2">
						<Label>{t("profile.fields.avatar")}</Label>
						<div className="flex items-center gap-3">
							<button
								type="button"
								className={cn(
									"flex h-12 w-12 items-center justify-center rounded-xl border bg-muted text-2xl",
									"hover:bg-accent",
								)}
								onClick={() => setShowEmojiPicker((prev) => !prev)}
								aria-label={t("profile.actions.pickEmoji")}
							>
								{avatarEmoji}
							</button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setShowEmojiPicker((prev) => !prev)}
							>
								<SmilePlus className="size-4" />
								{t("profile.actions.pickEmoji")}
							</Button>
						</div>
						{showEmojiPicker ? (
							<div className="rounded-lg border p-2">
								<SafeEmojiPicker
									width="100%"
									height={480}
									onEmojiClick={(emojiData) => {
										setAvatarEmoji(emojiData.emoji);
										setShowEmojiPicker(false);
									}}
									lazyLoadEmojis
									searchDisabled={false}
									skinTonesDisabled
								/>
							</div>
						) : null}
					</div>

					<div className="space-y-2">
						<Label htmlFor="profile-color" className="flex items-center gap-1">
							<Palette className="size-4" />
							{t("profile.fields.primaryColorOptional")}
						</Label>
						<div className="flex items-center gap-3">
							<input
								id="profile-color"
								type="color"
								value={primaryColor}
								onChange={(event) => setPrimaryColor(event.target.value)}
								className="h-10 w-16 rounded-md border bg-background p-1"
							/>
							<span className="font-mono text-xs text-muted-foreground">
								{primaryColor}
							</span>
						</div>
					</div>
				</div>

				{error ? (
					<p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{error}
					</p>
				) : null}

				<DialogFooter>
					{allowClose ? (
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
					) : null}
					<Button
						onClick={() => {
							const nextNickname = nickname.trim();
							if (!nextNickname) {
								setError(t("profile.errors.nicknameRequired"));
								return;
							}
							onCreate({
								nickname: nextNickname,
								avatarEmoji,
								primaryColor,
							});
						}}
					>
						{t("profile.actions.create")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
