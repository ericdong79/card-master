import { SM2_DEFAULT_PARAMETERS } from "@/lib/scheduling/sm2/const";
import type { ApiClient, QueryOptions } from "./client";
import type { SchedulingProfileInsert } from "./dtos/scheduling-profile";
import type { SchedulingProfile } from "./entities/scheduling-profile";
import {
	isFirestoreApiClient,
	listFirestoreRecords,
	ownershipConstraints,
} from "./firestore-client";
import { createCloudOwnership, hasCloudOwnership } from "./ownership";
import { generateId, nowIso } from "./utils";

const DEFAULT_PROFILE: Omit<
	SchedulingProfileInsert,
	"account_user_id" | "profile_id" | "owner_user_id"
> = {
	algorithm_key: "sm2",
	version: 1,
	parameters: { ...SM2_DEFAULT_PARAMETERS },
};

function hasLegacyOwnership(
	record: Pick<SchedulingProfile, "owner_user_id">,
	ownerUserId: string,
): boolean {
	return record.owner_user_id === ownerUserId;
}

export function fetchSchedulingProfile(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
): Promise<SchedulingProfile | null>;
export function fetchSchedulingProfile(
	client: ApiClient,
	ownerUserId: string,
): Promise<SchedulingProfile | null>;
export async function fetchSchedulingProfile(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileId?: string,
): Promise<SchedulingProfile | null> {
	const options: QueryOptions<SchedulingProfile> = {
		filter: (profile) =>
			profileId
				? hasCloudOwnership(profile, accountUserIdOrOwnerUserId, profileId)
				: hasLegacyOwnership(profile, accountUserIdOrOwnerUserId),
		sortBy: (a, b) =>
			Date.parse(a.created_at ?? "") - Date.parse(b.created_at ?? ""),
	};
	const profiles =
		profileId && isFirestoreApiClient(client)
			? await listFirestoreRecords(
					"scheduling_profile",
					ownershipConstraints(accountUserIdOrOwnerUserId, profileId),
					options,
				)
			: await client.list("scheduling_profile", options);

	return profiles[0] ?? null;
}

type SchedulingProfileOverrides = Partial<
	Omit<
		SchedulingProfileInsert,
		"account_user_id" | "profile_id" | "owner_user_id"
	>
>;

export function createSchedulingProfile(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	overrides?: SchedulingProfileOverrides,
): Promise<SchedulingProfile>;
export function createSchedulingProfile(
	client: ApiClient,
	ownerUserId: string,
	overrides?: SchedulingProfileOverrides,
): Promise<SchedulingProfile>;
export async function createSchedulingProfile(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileIdOrOverrides: string | SchedulingProfileOverrides = {},
	maybeOverrides: SchedulingProfileOverrides = {},
): Promise<SchedulingProfile> {
	const isCloudScoped = typeof profileIdOrOverrides === "string";
	const profileId = isCloudScoped ? profileIdOrOverrides : accountUserIdOrOwnerUserId;
	const overrides = isCloudScoped ? maybeOverrides : profileIdOrOverrides;
	const payload: SchedulingProfileInsert = {
		...DEFAULT_PROFILE,
		...overrides,
		...createCloudOwnership(accountUserIdOrOwnerUserId, profileId),
	};

	const record: SchedulingProfile = {
		id: generateId(),
		account_user_id: payload.account_user_id,
		profile_id: payload.profile_id,
		owner_user_id: payload.owner_user_id,
		algorithm_key: payload.algorithm_key,
		parameters: payload.parameters,
		version: payload.version,
		created_at: nowIso(),
	};

	await client.put("scheduling_profile", record);
	return record;
}

export function getOrCreateSchedulingProfile(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
): Promise<SchedulingProfile>;
export function getOrCreateSchedulingProfile(
	client: ApiClient,
	ownerUserId: string,
): Promise<SchedulingProfile>;
export async function getOrCreateSchedulingProfile(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileId?: string,
): Promise<SchedulingProfile> {
	const existing = profileId
		? await fetchSchedulingProfile(client, accountUserIdOrOwnerUserId, profileId)
		: await fetchSchedulingProfile(client, accountUserIdOrOwnerUserId);
	if (existing) return existing;
	return profileId
		? createSchedulingProfile(client, accountUserIdOrOwnerUserId, profileId)
		: createSchedulingProfile(client, accountUserIdOrOwnerUserId);
}
