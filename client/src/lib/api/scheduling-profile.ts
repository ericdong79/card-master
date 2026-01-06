import { SM2_DEFAULT_PARAMETERS } from "../scheduling/sm2";
import type { ApiClient } from "./client";
import type { SchedulingProfileInsert } from "./dtos/scheduling-profile";
import type { SchedulingProfile } from "./entities/scheduling-profile";
import { generateId, nowIso } from "./utils";

const DEFAULT_PROFILE: Omit<SchedulingProfileInsert, "owner_user_id"> = {
	algorithm_key: "sm2",
	version: 1,
	parameters: { ...SM2_DEFAULT_PARAMETERS },
};

export async function fetchSchedulingProfile(
	client: ApiClient,
	ownerUserId: string,
): Promise<SchedulingProfile | null> {
	const profiles = await client.list("scheduling_profile", {
		filter: (profile) => profile.owner_user_id === ownerUserId,
		sortBy: (a, b) =>
			Date.parse(a.created_at ?? "") - Date.parse(b.created_at ?? ""),
	});

	return profiles[0] ?? null;
}

export async function createSchedulingProfile(
	client: ApiClient,
	ownerUserId: string,
	overrides: Partial<SchedulingProfileInsert> = {},
): Promise<SchedulingProfile> {
	const payload: SchedulingProfileInsert = {
		...DEFAULT_PROFILE,
		...overrides,
		owner_user_id: ownerUserId,
	};

	const record: SchedulingProfile = {
		id: generateId(),
		owner_user_id: payload.owner_user_id,
		algorithm_key: payload.algorithm_key,
		parameters: payload.parameters,
		version: payload.version,
		created_at: nowIso(),
	};

	await client.put("scheduling_profile", record);
	return record;
}

export async function getOrCreateSchedulingProfile(
	client: ApiClient,
	ownerUserId: string,
): Promise<SchedulingProfile> {
	const existing = await fetchSchedulingProfile(client, ownerUserId);
	if (existing) return existing;
	return createSchedulingProfile(client, ownerUserId);
}
