import { Info, Palette, SlidersHorizontal, SmilePlus } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	type HanziFontPreference,
	useProfile,
} from "@/features/profile/profile-context";
import { type AppLanguage, setPreferredLanguage } from "@/i18n";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import { useSystemPreferences } from "@/lib/preferences/system-preferences";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

export function PreferencesPage() {
	const { t, i18n } = useTranslation();
	const { currentProfile, updateCurrentProfile } = useProfile();
	const { preferences: systemPreferences, updatePreferences } =
		useSystemPreferences();
	const [nickname, setNickname] = useState("");
	const [avatarEmoji, setAvatarEmoji] = useState("😀");
	const [primaryColor, setPrimaryColor] = useState("#0ee17f");
	const [hanziFont, setHanziFont] = useState<HanziFontPreference>("default");
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);

	useEffect(() => {
		if (!currentProfile) return;
		setNickname(currentProfile.nickname);
		setAvatarEmoji(currentProfile.avatar_emoji);
		setPrimaryColor(currentProfile.primary_color ?? "#0ee17f");
		setHanziFont(currentProfile.hanzi_font ?? "default");
	}, [currentProfile]);

	if (!currentProfile) {
		return null;
	}

	return (
		<div className="mx-auto w-full max-w-4xl px-6 py-8">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-xl">
						<SlidersHorizontal className="size-5" />
						{t("preferences.title")}
					</CardTitle>
					<CardDescription>{t("preferences.subtitle")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-4 rounded-lg border bg-muted/20 p-4">
						<div className="text-sm font-medium">
							{t("preferences.profile.title")}
						</div>

						<div className="space-y-2">
							<Label htmlFor="profile-name">
								{t("profile.fields.nickname")}
							</Label>
							<Input
								id="profile-name"
								value={nickname}
								onChange={(event) => setNickname(event.target.value)}
								onBlur={() => {
									const nextNickname = nickname.trim();
									if (
										!nextNickname ||
										nextNickname === currentProfile.nickname
									) {
										setNickname(currentProfile.nickname);
										return;
									}
									updateCurrentProfile({ nickname: nextNickname });
								}}
							/>
						</div>

						<div className="space-y-2">
							<Label>{t("profile.fields.avatar")}</Label>
							<div className="flex items-center gap-3">
								<button
									type="button"
									className="flex h-12 w-12 items-center justify-center rounded-xl border bg-background text-2xl hover:bg-accent"
									onClick={() => setShowEmojiPicker((prev) => !prev)}
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
									<Suspense
										fallback={
											<div className="h-80 w-full animate-pulse rounded bg-muted" />
										}
									>
										<EmojiPicker
											width="100%"
											height={480}
											onEmojiClick={(emojiData) => {
												const nextEmoji = emojiData.emoji;
												setAvatarEmoji(nextEmoji);
												updateCurrentProfile({ avatarEmoji: nextEmoji });
												setShowEmojiPicker(false);
											}}
											lazyLoadEmojis
											searchDisabled={false}
											skinTonesDisabled
										/>
									</Suspense>
								</div>
							) : null}
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="profile-color"
								className="flex items-center gap-1"
							>
								<Palette className="size-4" />
								{t("profile.fields.primaryColorOptional")}
							</Label>
							<div className="flex items-center gap-3">
								<input
									id="profile-color"
									type="color"
									value={primaryColor}
									onChange={(event) => {
										const nextColor = event.target.value;
										setPrimaryColor(nextColor);
										updateCurrentProfile({ primaryColor: nextColor });
									}}
									className="h-10 w-16 rounded-md border bg-background p-1"
								/>
								<span className="font-mono text-xs text-muted-foreground">
									{primaryColor}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										setPrimaryColor("#0ee17f");
										updateCurrentProfile({ primaryColor: null });
									}}
								>
									{t("preferences.profile.resetThemeColor")}
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								{currentProfile.primary_color
									? t("preferences.profile.customColorActive")
									: t("preferences.profile.defaultColorActive")}
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="default-language">
								{t("preferences.profile.defaultLanguage")}
							</Label>
							<select
								id="default-language"
								className="h-9 rounded border border-input bg-background px-2 text-sm"
								value={i18n.language === "zh-CN" ? "zh-CN" : "en"}
								onChange={(event) => {
									void setPreferredLanguage(event.target.value as AppLanguage);
								}}
							>
								<option value="en">{t("language.english")}</option>
								<option value="zh-CN">{t("language.chineseSimplified")}</option>
							</select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="hanzi-font">
								{t("preferences.profile.hanziFont")}
							</Label>
							<select
								id="hanzi-font"
								className="h-9 rounded border border-input bg-background px-2 text-sm"
								value={hanziFont}
								onChange={(event) => {
									const nextFont = event.target.value as HanziFontPreference;
									setHanziFont(nextFont);
									updateCurrentProfile({ hanziFont: nextFont });
								}}
							>
								<option value="default">
									{t("preferences.profile.hanziFontOptions.default")}
								</option>
								<option value="kaiti">
									{t("preferences.profile.hanziFontOptions.kaiti")}
								</option>
								<option value="pixel">
									{t("preferences.profile.hanziFontOptions.pixel")}
								</option>
							</select>
						</div>
					</div>

					<div className="space-y-4 rounded-lg border bg-muted/20 p-4">
						<div className="text-sm font-medium">
							{t("preferences.blocks.system.title")}
						</div>
						<p className="text-xs text-muted-foreground">
							{t("preferences.blocks.system.description")}
						</p>

						<div className="flex items-center justify-between gap-4">
							<div className="space-y-1">
								<Label htmlFor="multi-pack-types">
									{t("preferences.system.enableMultiPackTypes")}
								</Label>
								<p className="text-xs text-muted-foreground">
									{t("preferences.system.enableMultiPackTypesHint")}
								</p>
							</div>
							<input
								id="multi-pack-types"
								type="checkbox"
								checked={systemPreferences.enableMultiPackTypes}
								onChange={(event) => {
									updatePreferences({
										enableMultiPackTypes: event.target.checked,
									});
								}}
								className="h-4 w-4 rounded border-input accent-primary"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="default-pack-type">
								{t("preferences.system.defaultPackType")}
							</Label>
							<select
								id="default-pack-type"
								className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
								value={systemPreferences.defaultCardPackType}
								onChange={(event) => {
									updatePreferences({
										defaultCardPackType: event.target.value as CardPackType,
									});
								}}
							>
								<option value="basic">{t("cardType.basic")}</option>
								<option value="image-recall">
									{t("cardType.imageRecall")}
								</option>
								<option value="pinyin-hanzi">
									{t("cardType.pinyinHanzi")}
								</option>
							</select>
							<p className="text-xs text-muted-foreground">
								{t("preferences.system.defaultPackTypeHint")}
							</p>
						</div>
					</div>

					<div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-sm">
						<span className="inline-flex items-center gap-2 font-medium">
							<Info className="size-4" />
							{t("preferences.blocks.version.title")}
						</span>
						<span className="font-mono text-muted-foreground">
							v0.0.0-placeholder
						</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
