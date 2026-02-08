import {
	createContext,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react";

import { generateId, nowIso } from "@/lib/api/utils";

const STORAGE_KEY = "card-master.profiles.v1";

export type HanziFontPreference = "default" | "kaiti" | "pixel";

export type UserProfile = {
	id: string;
	nickname: string;
	avatar_emoji: string;
	primary_color: string | null;
	hanzi_font: HanziFontPreference;
	created_at: string;
	updated_at: string | null;
	last_used_at: string;
};

type StoredProfileState = {
	profiles: UserProfile[];
	current_profile_id: string | null;
};

type CreateProfileInput = {
	nickname: string;
	avatarEmoji: string;
	primaryColor?: string | null;
	hanziFont?: HanziFontPreference;
};

type ProfileContextValue = {
	ready: boolean;
	profiles: UserProfile[];
	currentProfile: UserProfile | null;
	createProfile: (input: CreateProfileInput) => UserProfile;
	switchProfile: (profileId: string) => void;
	updateCurrentProfile: (updates: {
		nickname?: string;
		avatarEmoji?: string;
		primaryColor?: string | null;
		hanziFont?: HanziFontPreference;
	}) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function resolveHanziFontPreference(value: unknown): HanziFontPreference {
	return value === "kaiti" || value === "pixel" ? value : "default";
}

function loadProfileState(): StoredProfileState {
	if (typeof window === "undefined") {
		return { profiles: [], current_profile_id: null };
	}

	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return { profiles: [], current_profile_id: null };
	}

	try {
		const parsed = JSON.parse(raw) as Partial<StoredProfileState>;
		const profiles = Array.isArray(parsed.profiles)
			? parsed.profiles.filter(
					(profile): profile is UserProfile =>
						typeof profile?.id === "string" &&
						profile.id.length > 0 &&
						typeof profile.nickname === "string" &&
						typeof profile.avatar_emoji === "string" &&
						typeof profile.created_at === "string" &&
						(typeof profile.updated_at === "string" ||
							profile.updated_at === null) &&
						typeof profile.last_used_at === "string" &&
						(typeof profile.primary_color === "string" ||
							profile.primary_color === null),
				)
					.map((profile) => ({
						...profile,
						hanzi_font: resolveHanziFontPreference(
							(profile as Partial<UserProfile>).hanzi_font,
						),
					}))
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

function persistProfileState(state: StoredProfileState) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function ProfileProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<StoredProfileState>(() => loadProfileState());

	const currentProfileId = useMemo(() => {
		if (state.profiles.length === 0) return null;
		if (
			state.current_profile_id &&
			state.profiles.some((profile) => profile.id === state.current_profile_id)
		) {
			return state.current_profile_id;
		}
		return state.profiles[0].id;
	}, [state.current_profile_id, state.profiles]);

	const currentProfile = useMemo(
		() =>
			currentProfileId
				? state.profiles.find(
						(profile) => profile.id === currentProfileId,
					) ?? null
				: null,
		[currentProfileId, state.profiles],
	);

	const value = useMemo<ProfileContextValue>(
		() => ({
			ready: true,
			profiles: state.profiles,
			currentProfile,
			createProfile: (input) => {
				const now = nowIso();
				const profile: UserProfile = {
					id: generateId(),
					nickname: input.nickname.trim(),
					avatar_emoji: input.avatarEmoji,
					primary_color: input.primaryColor ?? null,
					hanzi_font: input.hanziFont ?? "kaiti",
					created_at: now,
					updated_at: null,
					last_used_at: now,
				};

				const nextState: StoredProfileState = {
					profiles: [...state.profiles, profile],
					current_profile_id: profile.id,
				};
				setState(nextState);
				persistProfileState(nextState);
				return profile;
			},
			switchProfile: (profileId) => {
				const existing = state.profiles.find(
					(profile) => profile.id === profileId,
				);
				if (!existing) return;

				const now = nowIso();
				const nextProfiles = state.profiles.map((profile) =>
					profile.id === profileId
						? {
								...profile,
								last_used_at: now,
							}
						: profile,
				);
				const nextState: StoredProfileState = {
					profiles: nextProfiles,
					current_profile_id: profileId,
				};
				setState(nextState);
				persistProfileState(nextState);
			},
			updateCurrentProfile: (updates) => {
				if (!currentProfileId) return;
				const now = nowIso();
				const nextProfiles = state.profiles.map((profile) => {
					if (profile.id !== currentProfileId) return profile;
					return {
						...profile,
						nickname: updates.nickname?.trim() ?? profile.nickname,
						avatar_emoji: updates.avatarEmoji ?? profile.avatar_emoji,
						primary_color:
							updates.primaryColor === undefined
								? profile.primary_color
								: updates.primaryColor,
						hanzi_font:
							updates.hanziFont === undefined
								? profile.hanzi_font
								: resolveHanziFontPreference(updates.hanziFont),
						updated_at: now,
					};
				});
				const nextState: StoredProfileState = {
					profiles: nextProfiles,
					current_profile_id: currentProfileId,
				};
				setState(nextState);
				persistProfileState(nextState);
			},
		}),
		[currentProfile, currentProfileId, state.profiles],
	);

	return (
		<ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
	);
}

export function useProfile() {
	const context = useContext(ProfileContext);
	if (!context) {
		throw new Error("useProfile must be used within ProfileProvider");
	}
	return context;
}
