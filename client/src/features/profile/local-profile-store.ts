import type {
	SidebarBackgroundPreference,
	HanziFontPreference,
	UserProfile,
} from "@/features/profile/profile-context";
import { normalizeDailyReviewSettings } from "@/features/review/daily-goal";

export const PROFILE_STORAGE_KEY = "card-master.profiles.v1";

export type StoredProfileState = {
	profiles: UserProfile[];
	current_profile_id: string | null;
};

function resolveHanziFontPreference(value: unknown): HanziFontPreference {
	return value === "kaiti" || value === "pixel" ? value : "default";
}

function resolveSidebarBackgroundPreference(
	value: unknown,
): SidebarBackgroundPreference {
	return value === "none" ? value : "nav-illustration";
}

function isLegacyProfile(value: unknown): value is Partial<UserProfile> {
	if (!value || typeof value !== "object") return false;
	const profile = value as Partial<UserProfile>;
	return (
		typeof profile.id === "string" &&
		profile.id.length > 0 &&
		typeof profile.nickname === "string" &&
		typeof profile.avatar_emoji === "string" &&
		typeof profile.created_at === "string" &&
		typeof profile.last_used_at === "string" &&
		(typeof profile.updated_at === "string" || profile.updated_at === null) &&
		(typeof profile.primary_color === "string" || profile.primary_color === null)
	);
}

function normalizeLegacyProfile(profile: Partial<UserProfile>): UserProfile {
	const settings = normalizeDailyReviewSettings({
		dailyGoal: profile.daily_goal,
		reviewPerDay: profile.review_per_day,
		newPerDay: profile.new_per_day,
	});

	return {
		id: profile.id ?? "",
		nickname: profile.nickname ?? "",
		avatar_emoji: profile.avatar_emoji ?? "😀",
		primary_color: profile.primary_color ?? null,
		hanzi_font: resolveHanziFontPreference(profile.hanzi_font),
		sidebar_background: resolveSidebarBackgroundPreference(
			profile.sidebar_background,
		),
		daily_goal: settings.dailyGoal,
		review_per_day: settings.reviewPerDay,
		new_per_day: settings.newPerDay,
		created_at: profile.created_at ?? profile.last_used_at ?? "",
		updated_at: profile.updated_at ?? null,
		last_used_at: profile.last_used_at ?? profile.created_at ?? "",
	};
}

export function loadLocalProfileState(): StoredProfileState {
	if (typeof window === "undefined") {
		return { profiles: [], current_profile_id: null };
	}

	const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
	if (!raw) {
		return { profiles: [], current_profile_id: null };
	}

	try {
		const parsed = JSON.parse(raw) as Partial<StoredProfileState>;
		const profiles = Array.isArray(parsed.profiles)
			? parsed.profiles
					.filter(isLegacyProfile)
					.map((profile) => normalizeLegacyProfile(profile))
			: [];
		const currentProfileId =
			typeof parsed.current_profile_id === "string"
				? parsed.current_profile_id
				: null;

		return {
			profiles,
			current_profile_id: currentProfileId,
		};
	} catch {
		return { profiles: [], current_profile_id: null };
	}
}
