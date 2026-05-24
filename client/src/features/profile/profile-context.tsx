/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";

import { useAuth } from "@/features/auth/use-auth";
import {
	loadLocalProfileState,
	type StoredProfileState,
} from "@/features/profile/local-profile-store";
import {
	getOrCreateAccountRecord,
	listCloudProfiles,
	saveCloudProfile,
	saveCloudProfileAndSetCurrentProfile,
	touchCloudProfileAndSetCurrentProfile,
	updateAccountCurrentProfile,
	type CloudUserProfile,
} from "@/features/profile/profile-repository";
import { normalizeDailyReviewSettings } from "@/features/review/daily-goal";
import { generateId, nowIso } from "@/lib/api/utils";

export type HanziFontPreference = "default" | "kaiti" | "pixel";
export type SidebarBackgroundPreference = "none" | "nav-illustration";

export type UserProfile = {
	id: string;
	nickname: string;
	avatar_emoji: string;
	primary_color: string | null;
	hanzi_font: HanziFontPreference;
	sidebar_background: SidebarBackgroundPreference;
	daily_goal: number;
	review_per_day: number;
	new_per_day: number;
	created_at: string;
	updated_at: string | null;
	last_used_at: string;
};

type CreateProfileInput = {
	nickname: string;
	avatarEmoji: string;
	primaryColor?: string | null;
	hanziFont?: HanziFontPreference;
	sidebarBackground?: SidebarBackgroundPreference;
	dailyGoal?: number;
	reviewPerDay?: number;
	newPerDay?: number;
};

type UpdateCurrentProfileInput = {
	nickname?: string;
	avatarEmoji?: string;
	primaryColor?: string | null;
	hanziFont?: HanziFontPreference;
	sidebarBackground?: SidebarBackgroundPreference;
	dailyGoal?: number;
	reviewPerDay?: number;
	newPerDay?: number;
};

type ProfileContextValue = {
	ready: boolean;
	profiles: UserProfile[];
	currentProfile: UserProfile | null;
	createProfile: (input: CreateProfileInput) => Promise<UserProfile>;
	switchProfile: (profileId: string) => Promise<void>;
	updateCurrentProfile: (updates: UpdateCurrentProfileInput) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function resolveHanziFontPreference(value: unknown): HanziFontPreference {
	return value === "kaiti" || value === "pixel" ? value : "default";
}

function resolveSidebarBackgroundPreference(
	value: unknown,
): SidebarBackgroundPreference {
	return value === "none" ? value : "nav-illustration";
}

function normalizeProfile(profile: UserProfile): UserProfile {
	const settings = normalizeDailyReviewSettings({
		dailyGoal: profile.daily_goal,
		reviewPerDay: profile.review_per_day,
		newPerDay: profile.new_per_day,
	});

	return {
		...profile,
		primary_color: profile.primary_color ?? null,
		hanzi_font: resolveHanziFontPreference(profile.hanzi_font),
		sidebar_background: resolveSidebarBackgroundPreference(
			profile.sidebar_background,
		),
		daily_goal: settings.dailyGoal,
		review_per_day: settings.reviewPerDay,
		new_per_day: settings.newPerDay,
	};
}

function toCloudProfile(
	profile: UserProfile,
	accountUserId: string,
): CloudUserProfile {
	return {
		...normalizeProfile(profile),
		account_user_id: accountUserId,
	};
}

function stripCloudFields(profile: CloudUserProfile): UserProfile {
	return normalizeProfile({
		id: profile.id,
		nickname: profile.nickname,
		avatar_emoji: profile.avatar_emoji,
		primary_color: profile.primary_color,
		hanzi_font: profile.hanzi_font,
		sidebar_background: profile.sidebar_background,
		daily_goal: profile.daily_goal,
		review_per_day: profile.review_per_day,
		new_per_day: profile.new_per_day,
		created_at: profile.created_at,
		updated_at: profile.updated_at,
		last_used_at: profile.last_used_at,
	});
}

function resolveCurrentProfileId(state: StoredProfileState): string | null {
	if (state.profiles.length === 0) return null;
	if (
		state.current_profile_id &&
		state.profiles.some((profile) => profile.id === state.current_profile_id)
	) {
		return state.current_profile_id;
	}
	return state.profiles[0].id;
}

function applyProfileUpdates(
	existing: UserProfile,
	updates: UpdateCurrentProfileInput,
	now: string,
): UserProfile {
	const settings = normalizeDailyReviewSettings({
		dailyGoal:
			updates.dailyGoal === undefined
				? existing.daily_goal
				: updates.dailyGoal,
		reviewPerDay:
			updates.reviewPerDay === undefined
				? existing.review_per_day
				: updates.reviewPerDay,
		newPerDay:
			updates.newPerDay === undefined
				? existing.new_per_day
				: updates.newPerDay,
	});

	return {
		...existing,
		nickname: updates.nickname?.trim() ?? existing.nickname,
		avatar_emoji: updates.avatarEmoji ?? existing.avatar_emoji,
		primary_color:
			updates.primaryColor === undefined
				? existing.primary_color
				: updates.primaryColor,
		hanzi_font:
			updates.hanziFont === undefined
				? existing.hanzi_font
				: resolveHanziFontPreference(updates.hanziFont),
		sidebar_background:
			updates.sidebarBackground === undefined
				? existing.sidebar_background
				: resolveSidebarBackgroundPreference(updates.sidebarBackground),
		daily_goal: settings.dailyGoal,
		review_per_day: settings.reviewPerDay,
		new_per_day: settings.newPerDay,
		updated_at: now,
	};
}

function createStaleAccountError(): Error {
	return new Error("Profile operation was superseded by an auth change");
}

async function importLegacyProfilesIfNeeded(
	accountUserId: string,
	cloudProfiles: CloudUserProfile[],
): Promise<StoredProfileState | null> {
	if (cloudProfiles.length > 0) return null;

	const legacyState = loadLocalProfileState();
	if (legacyState.profiles.length === 0) return null;

	await Promise.all(
		legacyState.profiles.map((profile) =>
			saveCloudProfile(toCloudProfile(profile, accountUserId)),
		),
	);

	const now = nowIso();
	const currentProfileId = resolveCurrentProfileId(legacyState);
	await updateAccountCurrentProfile(accountUserId, currentProfileId, now);

	return {
		profiles: legacyState.profiles.map(normalizeProfile),
		current_profile_id: currentProfileId,
	};
}

export function ProfileProvider({ children }: { children: ReactNode }) {
	const { user, accountUserId } = useAuth();
	const [ready, setReady] = useState(false);
	const [state, setState] = useState<StoredProfileState>({
		profiles: [],
		current_profile_id: null,
	});
	const stateRef = useRef(state);
	const accountUserIdRef = useRef(accountUserId);
	const updateQueueRef = useRef(Promise.resolve());

	useLayoutEffect(() => {
		stateRef.current = state;
	}, [state]);

	useLayoutEffect(() => {
		accountUserIdRef.current = accountUserId;
	}, [accountUserId]);

	const setProfileState = useCallback(
		(
			updater:
				| StoredProfileState
				| ((previous: StoredProfileState) => StoredProfileState),
		) => {
			const next =
				typeof updater === "function" ? updater(stateRef.current) : updater;
			stateRef.current = next;
			setState(next);
		},
		[],
	);

	const assertActiveAccount = useCallback((operationAccountUserId: string) => {
		if (accountUserIdRef.current !== operationAccountUserId) {
			throw createStaleAccountError();
		}
	}, []);

	const enqueueProfileUpdate = useCallback(
		<T,>(operation: () => Promise<T>): Promise<T> => {
			const queued = updateQueueRef.current.then(operation, operation);
			updateQueueRef.current = queued.then(
				() => undefined,
				() => undefined,
			);
			return queued;
		},
		[],
	);

	useEffect(() => {
		let cancelled = false;

		async function loadProfiles() {
			setReady(false);

			if (!user || !accountUserId) {
				if (!cancelled) {
					setProfileState({ profiles: [], current_profile_id: null });
					setReady(true);
				}
				return;
			}

			try {
				const now = nowIso();
				const account = await getOrCreateAccountRecord({
					id: accountUserId,
					email: user.email,
					displayName: user.displayName,
					photoUrl: user.photoURL,
					now,
				});
				const cloudProfiles = await listCloudProfiles(accountUserId);
				const importedState = await importLegacyProfilesIfNeeded(
					accountUserId,
					cloudProfiles,
				);

				if (cancelled) return;

				if (importedState) {
					setProfileState(importedState);
				} else {
					setProfileState({
						profiles: cloudProfiles.map(stripCloudFields),
						current_profile_id: account.current_profile_id,
					});
				}
				setReady(true);
			} catch (error) {
				console.error("Failed to load cloud profiles", error);
				if (!cancelled) {
					setProfileState({ profiles: [], current_profile_id: null });
					setReady(true);
				}
			}
		}

		void loadProfiles();

		return () => {
			cancelled = true;
		};
	}, [accountUserId, setProfileState, user]);

	const currentProfileId = useMemo(
		() => resolveCurrentProfileId(state),
		[state],
	);

	const currentProfile = useMemo(
		() =>
			currentProfileId
				? state.profiles.find(
						(profile) => profile.id === currentProfileId,
					) ?? null
				: null,
		[currentProfileId, state.profiles],
	);

	const createProfile = useCallback(
		async (input: CreateProfileInput): Promise<UserProfile> => {
			if (!accountUserId) {
				throw new Error("Cannot create a profile while signed out");
			}

			const now = nowIso();
			const settings = normalizeDailyReviewSettings({
				dailyGoal: input.dailyGoal,
				reviewPerDay: input.reviewPerDay,
				newPerDay: input.newPerDay,
			});
			const profile: UserProfile = {
				id: generateId(),
				nickname: input.nickname.trim(),
				avatar_emoji: input.avatarEmoji,
				primary_color: input.primaryColor ?? null,
				hanzi_font: input.hanziFont ?? "kaiti",
				sidebar_background: input.sidebarBackground ?? "nav-illustration",
				daily_goal: settings.dailyGoal,
				review_per_day: settings.reviewPerDay,
				new_per_day: settings.newPerDay,
				created_at: now,
				updated_at: null,
				last_used_at: now,
			};

			assertActiveAccount(accountUserId);

			await saveCloudProfileAndSetCurrentProfile(
				toCloudProfile(profile, accountUserId),
				now,
			);

			assertActiveAccount(accountUserId);

			setProfileState((previous) => ({
				profiles: [...previous.profiles, profile],
				current_profile_id: profile.id,
			}));

			return profile;
		},
		[accountUserId, assertActiveAccount, setProfileState],
	);

	const switchProfile = useCallback(
		async (profileId: string): Promise<void> => {
			if (!accountUserId) return;

			const existing = stateRef.current.profiles.find(
				(profile) => profile.id === profileId,
			);
			if (!existing) return;

			const now = nowIso();

			assertActiveAccount(accountUserId);

			await touchCloudProfileAndSetCurrentProfile(
				accountUserId,
				profileId,
				now,
			);

			assertActiveAccount(accountUserId);

			setProfileState((previous) => ({
				profiles: previous.profiles.map((profile) =>
					profile.id === profileId
						? { ...profile, last_used_at: now }
						: profile,
				),
				current_profile_id: profileId,
			}));
		},
		[accountUserId, assertActiveAccount, setProfileState],
	);

	const updateCurrentProfile = useCallback(
		async (updates: UpdateCurrentProfileInput): Promise<void> => {
			if (!accountUserId || !currentProfileId) return;

			await enqueueProfileUpdate(async () => {
				const existing = stateRef.current.profiles.find(
					(profile) => profile.id === currentProfileId,
				);
				if (!existing) return;

				const now = nowIso();
				const updatedProfile = applyProfileUpdates(existing, updates, now);

				assertActiveAccount(accountUserId);

				await saveCloudProfile(toCloudProfile(updatedProfile, accountUserId));

				assertActiveAccount(accountUserId);

				setProfileState((previous) => ({
					profiles: previous.profiles.map((profile) =>
						profile.id === currentProfileId ? updatedProfile : profile,
					),
					current_profile_id: previous.current_profile_id,
				}));
			});
		},
		[
			accountUserId,
			assertActiveAccount,
			currentProfileId,
			enqueueProfileUpdate,
			setProfileState,
		],
	);

	const value = useMemo<ProfileContextValue>(
		() => ({
			ready,
			profiles: state.profiles,
			currentProfile,
			createProfile,
			switchProfile,
			updateCurrentProfile,
		}),
		[
			ready,
			state.profiles,
			currentProfile,
			createProfile,
			switchProfile,
			updateCurrentProfile,
		],
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
